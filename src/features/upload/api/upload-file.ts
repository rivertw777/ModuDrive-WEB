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
// storage-service (PresignBlockUploadsService): spec 001 2장.
const MAX_GROUP_FILES = 100
const MAX_GROUP_HASHES = 1280
// At most 256MB (64 × 4MB), PUT right after the request; a URL that still runs out of its hour
// (a long pause on a slow link) is asked for again once (spec 001 6).
const MAX_URL_REQUEST_BLOCKS = 64
// A file over this many blocks (256MB) goes in a group of its own: a group's files all finish
// together, so small files sharing it would wait out the big file's transfer.
const SOLO_BLOCKS = 64
// Block PUTs in flight at once — as many connections as a browser opens to one origin anyway.
const PARALLEL_BLOCK_PUTS = 6

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

/** A file the commit refused. Its 413 is the drive being full (QUOTA_EXCEEDED — WEB never sends a
 * file over 5GB), unlike a block request's 413. */
const commitError = ({ status, message }: { status: number; message: string }) =>
  Object.assign(new Error(message), { quotaExceeded: status === 413 })

const blockBytes = (file: File, index: number) => Math.min(BLOCK_SIZE, file.size - index * BLOCK_SIZE)

/** The SHA-256 as S3 takes it in x-amz-checksum-sha256: Base64 of the raw digest. */
const checksumOf = (hash: string) =>
  btoa(String.fromCharCode(...Array.from({ length: hash.length / 2 }, (_, i) => parseInt(hash.slice(i * 2, i * 2 + 2), 16))))

/** PUTs one block straight to S3 through its presigned URL (spec 001 6). S3 checks the bytes against
 * the signed checksum and size, and writes only where nothing is yet — a 412 means the block is
 * already there, which is what the upload wanted. A network failure, or a 409 (another PUT of the
 * same block in flight), rejects with no status — worth another try, which then ends in 412. */
async function putBlock(url: string, hash: string, block: Blob) {
  const response = await fetch(url, {
    method: 'PUT',
    body: block,
    headers: { 'x-amz-checksum-sha256': checksumOf(hash), 'If-None-Match': '*' },
  })
  if (response.ok || response.status === 412) return
  if (response.status === 409) throw new Error('블록을 올리는 중 충돌했습니다.')
  throw Object.assign(new Error('블록을 올리지 못했습니다.'), { status: response.status, fromS3: true })
}

/**
 * Uploads one group of files (see {@link groupForCommit}) the way API
 * .docs/spec/001-file-upload-spec.md §2 lays out. Each file is the SHA-256 list of its 4MB blocks
 * (its blocklist, from `hashFile`). One commit for the whole group answers, per file, which blocks the server
 * doesn't have yet; those are sent once each — a block shared by several files too — straight to S3
 * through URLs storage-service signs, then the files that needed them are committed again together. So files already in the
 * drive, or a re-upload after a failure, skip what's already there: asking again is how an upload
 * resumes.
 *
 * A file `isCancelled` says the user gave up on gets no more of its blocks sent and no second
 * commit; one already committed by the first commit stays.
 *
 * Resolves with one outcome per file, in order: null when it was committed, else why it failed.
 * Rejects only when a commit request itself fails, which fails the whole group.
 */
export async function uploadGroup(
  targets: UploadTarget[],
  blocklists: string[][],
  onProgress: (index: number, sentBytes: number) => void,
  onPause: (paused: boolean) => void = () => {},
  isCancelled: (index: number) => boolean = () => false,
): Promise<(Error | null)[]> {
  // Several requests can wait at once; the group is paused while any of them is.
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
    if (result.error) outcomes[i] = commitError(result.error)
    else if (result.needBlocks?.length) missing.set(i, new Set(result.needBlocks))
    else outcomes[i] = null
    if (!result.error) onProgress(i, sentBytes(i))
  })
  if (missing.size === 0) return outcomes.map((outcome) => outcome ?? null)

  // Every needed block once, its URL asked for in requests of at most 64 blocks.
  const queue: { request: number; index: number; hash: string; block: Blob }[] = []
  const requests: { hash: string; size: number }[][] = [[]]
  const queued = new Set<string>()
  for (const [i, hashes] of missing) {
    blocklists[i].forEach((hash, index) => {
      if (!hashes.has(hash) || queued.has(hash)) return
      queued.add(hash)
      const block = blockAt(targets[i].file, index)
      const current = requests[requests.length - 1]
      if (current.length === MAX_URL_REQUEST_BLOCKS) requests.push([])
      queue.push({ request: requests.length - 1, index: requests[requests.length - 1].length, hash, block })
      requests[requests.length - 1].push({ hash, size: block.size })
    })
  }

  let sendError: unknown = null
  // Files a block was refused for (a file changed since it was hashed, say): only they fail.
  const refused = new Map<number, unknown>()
  const askUrls = (blocks: { hash: string; size: number }[]) =>
    withRetry(
      () => apiClient.post<{ urls: string[] }>('/api/v1/storage/blocks/upload-urls', { blocks }),
      pause,
      () => sendError !== null,
    ).then((response) => response.urls)
  // A request's URLs, asked for when its first block is about to go.
  const urls = new Map<number, Promise<string[]>>()
  const urlsFor = (request: number) => {
    let pending = urls.get(request)
    if (!pending) {
      pending = askUrls(requests[request])
      urls.set(request, pending)
    }
    return pending
  }
  const put = (url: string, hash: string, block: Blob) =>
    withRetry(() => putBlock(url, hash, block), pause, () => sendError !== null)
  let next = 0
  const sendBlocks = async () => {
    // Once one request has given up — paused too long, or the 24-hour limit — the rest would fail
    // the same way.
    while (sendError === null && next < queue.length) {
      const { request, index, hash, block } = queue[next++]
      if ([...missing].every(([i, hashes]) => !hashes.has(hash) || isCancelled(i))) continue
      try {
        try {
          await put((await urlsFor(request))[index], hash, block)
        } catch (error) {
          const { status, fromS3 } = error as { status?: number; fromS3?: boolean }
          if (!(fromS3 && status === 403)) throw error
          // The URL ran out of its hour: one fresh URL for this block, one more try.
          const [url] = await askUrls([{ hash, size: block.size }])
          await put(url, hash, block)
        }
      } catch (error) {
        // About this block: refused in the URL request (400/413), or by S3 (400 the bytes changed,
        // 403 even with a fresh URL). Anything else (429 limit, 401 session gone, a pause that ran out)
        // would fail every block the same way.
        const { status, fromS3 } = error as { status?: number; fromS3?: boolean }
        if (status !== 400 && status !== 413 && !(fromS3 && status === 403)) {
          sendError ??= error
          return
        }
        for (const [i, hashes] of missing) {
          if (hashes.has(hash)) refused.set(i, error)
        }
        continue
      }
      for (const [i, hashes] of missing) {
        if (hashes.delete(hash)) onProgress(i, sentBytes(i))
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL_BLOCK_PUTS, queue.length) }, sendBlocks))

  const ready = [...missing]
    .filter(([i, hashes]) => hashes.size === 0 && !refused.has(i) && !isCancelled(i))
    .map(([i]) => i)
  for (const [i, hashes] of missing) {
    if (isCancelled(i)) {
      outcomes[i] = new Error('Upload cancelled')
    } else if (hashes.size > 0 || refused.has(i)) {
      const error = refused.get(i) ?? sendError
      outcomes[i] = error instanceof Error ? error : new Error('Block upload failed')
    }
  }
  if (ready.length > 0) {
    const second = await commit(ready)
    second.forEach((result, k) => {
      const i = ready[k]
      if (result.error) outcomes[i] = commitError(result.error)
      // Only if an uploaded block expired in between (24h) — the next attempt uploads it again.
      else if (result.needBlocks?.length) outcomes[i] = new Error('Blocks still missing after upload')
      else outcomes[i] = null
    })
  }
  return outcomes.map((outcome) => outcome ?? null)
}
