import { apiClient } from '@/lib/api-client'

// Mirrors UploadBatchService.MAX_FILE_SIZE_BYTES in file-service, which the commit enforces.
export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
// Mirrors the @Size cap on UploadBatchRequest.items in file-service.
export const MAX_BATCH_ITEMS = 5000

// Must equal storage.block-size in storage-service (and FileVersion.BLOCK_SIZE in file-service): a
// file is a list of 4MB blocks, and the server checks every block but the last is exactly this.
const BLOCK_SIZE = 4 * 1024 * 1024 // 4MB
const RETRY_DELAYS_MS = [1000, 2000, 4000]

export type ConflictResolution = 'REPLACE' | 'KEEP_BOTH' | 'SKIP'

/** `relativePath` is relative to the folder being uploaded into, "/"-separated. */
export type BatchItem = { relativePath: string; directory: boolean; size?: number }

export type BatchCreatedItem = {
  /** The request's own path — how a result is matched back to the File it came from. */
  relativePath: string
  fileId: string
  /** Where it actually landed: differs from the request when a top-level name was numbered. */
  name: string
  path: string
  directory: boolean
  replaced: boolean
}

/**
 * Registers the whole selection — folders and files — in one request (see the upload spec,
 * API .docs/spec/001-file-upload-spec.md §3). Files come back PENDING; their bytes are sent
 * per file with {@link uploadBytes}.
 */
export async function createUploadBatch(
  path: string,
  items: BatchItem[],
  resolutions: Record<string, ConflictResolution>,
) {
  const { items: created } = await apiClient.post<{ items: BatchCreatedItem[] }>(
    '/api/v1/files/batch',
    { path, items, resolutions },
  )
  return created
}

/** The top-level file names a 409 from {@link createUploadBatch} says need a user decision, or
 * null for any other failure. Keyed on the status, not the message, so no other error can ever
 * open the conflict dialog. */
export function batchConflicts(error: unknown): string[] | null {
  const { status, data } = (error ?? {}) as { status?: number; data?: { conflicts?: unknown } }
  if (status !== 409 || !Array.isArray(data?.conflicts)) return null
  return data.conflicts.filter((name): name is string => typeof name === 'string')
}

/** Network errors, 429 and 5xx are worth another try; any other 4xx will fail the same way again. */
function isRetryable(error: unknown) {
  const { status } = (error ?? {}) as { status?: number }
  return status === undefined || status === 429 || status >= 500
}

async function withRetry<T>(send: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await send()
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length || !isRetryable(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
    }
  }
}

type CommitResponse = { needBlocks: string[]; versionId: string | null }

async function sha256Hex(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Sends one PENDING file's bytes the way spec 008 (API .docs/spec/008-file-upload-spec.md) lays
 * out: the file is the SHA-256 list of its 4MB blocks (the blocklist). Committing it answers which
 * blocks the server doesn't have yet; only those are uploaded, then the same commit goes again and
 * makes the version. So a file already in the drive, or a re-upload after a failure, skips what's
 * already there — there is no session to keep, asking again is how an upload resumes.
 */
export async function uploadBytes(
  fileId: string,
  file: File,
  onProgress: (sentBytes: number) => void,
) {
  const blockCount = Math.ceil(file.size / BLOCK_SIZE)
  const blockAt = (index: number) => file.slice(index * BLOCK_SIZE, (index + 1) * BLOCK_SIZE)
  const blockBytes = (index: number) => Math.min(BLOCK_SIZE, file.size - index * BLOCK_SIZE)

  // ponytail: hashed on the main thread, one block at a time (a 5GB file takes tens of seconds);
  // move to a Web Worker if that ever freezes the tab.
  const blocklist: string[] = []
  for (let index = 0; index < blockCount; index++) {
    blocklist.push(await sha256Hex(blockAt(index)))
  }

  // One id for every commit of this attempt, so a commit whose response was lost can be sent
  // again and get back the version it already made.
  const uploadId = crypto.randomUUID()
  const commit = () =>
    withRetry(() =>
      apiClient.post<CommitResponse>(`/api/v1/files/${fileId}/commit`, {
        uploadId,
        size: file.size,
        blocklist,
      }),
    )

  const { needBlocks } = await commit()
  const missing = new Set(needBlocks)
  // A block the server already has counts as sent; the same hash can sit at several positions.
  const sentBytes = () =>
    blocklist.reduce((sum, hash, index) => (missing.has(hash) ? sum : sum + blockBytes(index)), 0)
  onProgress(sentBytes())
  if (missing.size === 0) return

  for (let index = 0; index < blockCount; index++) {
    const hash = blocklist[index]
    if (!missing.has(hash)) continue
    const block = blockAt(index)
    await withRetry(() => {
      const formData = new FormData()
      formData.append('block', block)
      return apiClient.put(`/api/v1/storage/blocks/${hash}`, formData)
    })
    missing.delete(hash)
    onProgress(sentBytes())
  }

  const second = await commit()
  if (second.needBlocks.length > 0) {
    // Only if an uploaded block expired in between (24h) — the next attempt uploads it again.
    throw new Error('Blocks still missing after upload')
  }
}
