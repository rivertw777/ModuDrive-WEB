import { apiClient } from '@/lib/api-client'
import { BLOCK_SIZE, blockAt, blockCountOf } from '../utils/hash-blocks'

// Mirrors UploadBatchService.MAX_FILE_SIZE_BYTES in file-service, which the commit enforces.
export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
// Mirrors the @Size cap on UploadBatchRequest.items in file-service.
export const MAX_BATCH_ITEMS = 5000

const RETRY_DELAYS_MS = [1000, 2000, 4000]
// Past the quick retries, an upload that can wait (S3 or a service down) pauses: one try every 30s,
// for up to 10 minutes, then the file fails. The picked File stays usable while the tab is open.
const PAUSED_RETRY_MS = 30_000
const MAX_PAUSE_MS = 10 * 60_000

export type ConflictResolution = 'REPLACE' | 'KEEP_BOTH' | 'SKIP'

/** `relativePath` is relative to the folder being uploaded into, "/"-separated. */
export type BatchItem = { relativePath: string; directory: boolean; size?: number }

export type BatchPlannedItem = {
  /** The request's own path — how a result is matched back to the File it came from. */
  relativePath: string
  /** The existing entry a replace or merge reuses; null for a new one. */
  fileId: string | null
  /** Where it will land: differs from the request when a top-level name was numbered. */
  name: string
  path: string
  directory: boolean
  replaced: boolean
}

/**
 * Checks the whole selection — folders and files — for name conflicts in one request and answers
 * where each entry will land (API .docs/spec/001-file-upload-spec.md §2). Creates nothing: a file
 * and the folders above it appear when {@link uploadGroup} commits it, an empty folder with
 * {@link commitFolders}.
 */
export async function planUploadBatch(
  path: string,
  items: BatchItem[],
  resolutions: Record<string, ConflictResolution>,
) {
  const { items: planned } = await apiClient.post<{ items: BatchPlannedItem[] }>(
    '/api/v1/files/batch',
    { path, items, resolutions },
  )
  return planned
}

// Mirrors the @Size cap on CommitFileUploadRequest.directories in file-service.
export const MAX_COMMIT_FOLDERS = 1000

export type FolderResult = { fileId?: string; error?: { status: number; message: string } }

/** Creates the folders no file commit made — empty ones, or ones whose files all failed — together
 * with any missing folder above them, through the same commit (spec 001 2-2). One result per
 * folder, in order; an existing folder is answered as is. */
export async function commitFolders(folders: { path: string; name: string }[]) {
  const { directories } = await withRetry(() =>
    apiClient.post<{ directories: FolderResult[] }>('/api/v1/files/commit', { directories: folders }),
  )
  return directories
}

/** The top-level file names a 409 from {@link planUploadBatch} says need a user decision, or
 * null for any other failure. Keyed on the status, not the message, so no other error can ever
 * open the conflict dialog. */
export function batchConflicts(error: unknown): string[] | null {
  const { status, data } = (error ?? {}) as { status?: number; data?: { conflicts?: unknown } }
  if (status !== 409 || !Array.isArray(data?.conflicts)) return null
  return data.conflicts.filter((name): name is string => typeof name === 'string')
}

/** Network errors and 5xx are worth another try; any 4xx will fail the same way again. That
 * includes 429: on these endpoints it is only UPLOAD_LIMIT_EXCEEDED, a 24-hour window. */
function isRetryable(error: unknown) {
  const { status } = (error ?? {}) as { status?: number }
  return status === undefined || status >= 500
}

/**
 * Sends, and on a retryable failure tries again: three quick retries, then — given `onPause` —
 * a paused wait ({@link PAUSED_RETRY_MS} apart, at most {@link MAX_PAUSE_MS}), told through
 * `onPause(true)` and, however it ends, `onPause(false)`. `shouldStop` cuts the waiting short once
 * the outcome no longer matters (another request already failed the group).
 */
async function withRetry<T>(
  send: () => Promise<T>,
  onPause?: (paused: boolean) => void,
  shouldStop: () => boolean = () => false,
): Promise<T> {
  let pausedAt: number | undefined
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await send()
      } catch (error) {
        if (!isRetryable(error) || shouldStop()) throw error
        let delay: number
        if (attempt < RETRY_DELAYS_MS.length) {
          delay = RETRY_DELAYS_MS[attempt]
        } else {
          if (!onPause) throw error
          if (pausedAt === undefined) {
            pausedAt = Date.now()
            onPause(true)
          }
          if (Date.now() - pausedAt >= MAX_PAUSE_MS) throw error
          delay = PAUSED_RETRY_MS
        }
        // Up to 50% jitter, so clients that failed together (S3 down) don't all come back on the same
        // beat — and never sooner than the server's Retry-After.
        const retryAfter = ((error as { retryAfter?: number }).retryAfter ?? 0) * 1000
        await new Promise((resolve) => setTimeout(resolve, Math.max(delay * (1 + Math.random() / 2), retryAfter)))
      }
    }
  } finally {
    if (pausedAt !== undefined) onPause?.(false)
  }
}

// Mirror the caps in file-service (CommitFileUploadRequest, CommitFileUploadService) and
// storage-service (UploadBlocksService): spec 001 2장.
const MAX_GROUP_FILES = 100
const MAX_GROUP_HASHES = 1280
const MAX_REQUEST_BLOCKS = 64
const MAX_REQUEST_BYTES = 8 * 1024 * 1024
// A file over this many blocks (256MB) goes in a group of its own: a group's files all finish
// together, so small files sharing it would wait out the big file's transfer.
const SOLO_BLOCKS = 64
// Block requests in flight at once: enough to hide each request's round trip, few enough to leave
// storage-service's upload seats (spec 006 2-4-4) to other users.
const PARALLEL_BLOCK_REQUESTS = 3

export type UploadTarget = { path: string; name: string; file: File }

type CommitResult = {
  needBlocks?: string[]
  fileId?: string
  versionId?: string
  error?: { status: number; message: string }
}

/**
 * Splits files, in order, into the groups one commit request takes: at most 100 files and 1,280
 * hashes in all, and a file over 256MB on its own.
 */
export function groupForCommit<T extends { file: File }>(targets: T[]): T[][] {
  const groups: T[][] = []
  let group: T[] = []
  let hashes = 0
  let soloGroup = false
  for (const target of targets) {
    const count = blockCountOf(target.file)
    const solo = count > SOLO_BLOCKS
    if (
      group.length > 0 &&
      (solo || soloGroup || group.length === MAX_GROUP_FILES || hashes + count > MAX_GROUP_HASHES)
    ) {
      groups.push(group)
      group = []
      hashes = 0
    }
    group.push(target)
    hashes += count
    soloGroup = solo
  }
  if (group.length > 0) groups.push(group)
  return groups
}

const blockBytes = (file: File, index: number) => Math.min(BLOCK_SIZE, file.size - index * BLOCK_SIZE)

/**
 * Uploads one group of files (see {@link groupForCommit}) the way API
 * .docs/spec/001-file-upload-spec.md §2 lays out. Each file is the SHA-256 list of its 4MB blocks
 * (its blocklist, from `hashFile`). One commit for the whole group answers, per file, which blocks the server
 * doesn't have yet; those are sent once each — a block shared by several files too — several per
 * request, then the files that needed them are committed again together. So files already in the
 * drive, or a re-upload after a failure, skip what's already there: asking again is how an upload
 * resumes.
 *
 * Resolves with one outcome per file, in order: null when it was committed, else why it failed.
 * Rejects only when a commit request itself fails, which fails the whole group.
 */
export async function uploadGroup(
  targets: UploadTarget[],
  blocklists: string[][],
  onProgress: (index: number, sentBytes: number) => void,
  onPause: (paused: boolean) => void = () => {},
): Promise<(Error | null)[]> {
  // Up to three block requests wait at once; the group is paused while any of them is.
  let waiting = 0
  const pause = (paused: boolean) => {
    waiting += paused ? 1 : -1
    if (waiting === (paused ? 1 : 0)) onPause(paused)
  }
  // One id per file for every commit of this attempt, so a commit whose response was lost can be
  // sent again and get back the version it already made.
  const uploadIds = targets.map(() => crypto.randomUUID())
  const commit = async (indexes: number[]) => {
    const { results } = await withRetry(
      () =>
        apiClient.post<{ results: CommitResult[] }>('/api/v1/files/commit', {
        files: indexes.map((i) => ({
          path: targets[i].path,
          name: targets[i].name,
          uploadId: uploadIds[i],
          size: targets[i].file.size,
          blocklist: blocklists[i],
        })),
        }),
      pause,
    )
    return results
  }

  const outcomes: (Error | null | undefined)[] = targets.map(() => undefined)
  const missing = new Map<number, Set<string>>()
  // A block the server already has counts as sent; the same hash can sit at several positions.
  const sentBytes = (i: number) =>
    blocklists[i].reduce(
      (sum, hash, index) => (missing.get(i)?.has(hash) ? sum : sum + blockBytes(targets[i].file, index)),
      0,
    )

  const first = await commit(targets.map((_, i) => i))
  first.forEach((result, i) => {
    if (result.error) outcomes[i] = new Error(result.error.message)
    else if (result.needBlocks?.length) missing.set(i, new Set(result.needBlocks))
    else outcomes[i] = null
    if (!result.error) onProgress(i, sentBytes(i))
  })
  if (missing.size === 0) return outcomes.map((outcome) => outcome ?? null)

  // Every needed block once, packed into requests of at most 64 blocks / 8MB.
  const needed = new Map<string, Blob>()
  for (const [i, hashes] of missing) {
    blocklists[i].forEach((hash, index) => {
      if (hashes.has(hash) && !needed.has(hash)) needed.set(hash, blockAt(targets[i].file, index))
    })
  }
  const requests: [string, Blob][][] = [[]]
  let requestBytes = 0
  for (const entry of needed) {
    const current = requests[requests.length - 1]
    if (current.length === MAX_REQUEST_BLOCKS || (current.length > 0 && requestBytes + entry[1].size > MAX_REQUEST_BYTES)) {
      requests.push([])
      requestBytes = 0
    }
    requests[requests.length - 1].push(entry)
    requestBytes += entry[1].size
  }

  let sendError: unknown = null
  // Files a block request was refused for (a file changed since it was hashed, say): only they fail.
  const refused = new Map<number, unknown>()
  let nextRequest = 0
  const sendRequests = async () => {
    // Once one request has given up — paused too long, or the 24-hour limit — the rest would fail
    // the same way.
    while (sendError === null && nextRequest < requests.length) {
      const blocks = requests[nextRequest++]
      try {
        await withRetry(() => {
          const formData = new FormData()
          for (const [hash, block] of blocks) {
            formData.append('hash', hash)
            formData.append('block', block)
          }
          return apiClient.post('/api/v1/storage/blocks', formData)
        }, pause, () => sendError !== null)
      } catch (error) {
        // 400/413 are about this request's blocks; anything else (429 limit, 401 session gone, a
        // pause that ran out) would fail every request the same way.
        const { status } = error as { status?: number }
        if (status !== 400 && status !== 413) {
          sendError ??= error
          return
        }
        for (const [i, hashes] of missing) {
          if (blocks.some(([hash]) => hashes.has(hash))) refused.set(i, error)
        }
        continue
      }
      for (const [i, hashes] of missing) {
        const before = hashes.size
        for (const [hash] of blocks) hashes.delete(hash)
        if (hashes.size < before) onProgress(i, sentBytes(i))
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL_BLOCK_REQUESTS, requests.length) }, sendRequests))

  const ready = [...missing].filter(([i, hashes]) => hashes.size === 0 && !refused.has(i)).map(([i]) => i)
  for (const [i, hashes] of missing) {
    if (hashes.size > 0 || refused.has(i)) {
      const error = refused.get(i) ?? sendError
      outcomes[i] = error instanceof Error ? error : new Error('Block upload failed')
    }
  }
  if (ready.length > 0) {
    const second = await commit(ready)
    second.forEach((result, k) => {
      const i = ready[k]
      if (result.error) outcomes[i] = new Error(result.error.message)
      // Only if an uploaded block expired in between (24h) — the next attempt uploads it again.
      else if (result.needBlocks?.length) outcomes[i] = new Error('Blocks still missing after upload')
      else outcomes[i] = null
    })
  }
  return outcomes.map((outcome) => outcome ?? null)
}
