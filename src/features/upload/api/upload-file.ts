import { apiClient } from '@/lib/api-client'

// Mirrors modudrive.storage.max-file-size-bytes in storage-service's application.yml (and
// UploadBatchService.MAX_FILE_SIZE_BYTES in file-service).
export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
// Mirrors the @Size cap on UploadBatchRequest.items in file-service.
export const MAX_BATCH_ITEMS = 5000

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
// Above this, upload in chunks via the resumable endpoints instead of one request
// holding the whole file in memory/formdata.
const RESUMABLE_THRESHOLD = 20 * 1024 * 1024 // 20MB

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

async function simpleUpload(fileId: string, file: File, onProgress: (sentBytes: number) => void) {
  const formData = new FormData()
  formData.append('file', file)
  await apiClient.post(`/api/v1/storage/upload?fileId=${fileId}`, formData, {
    onUploadProgress: (event) => {
      // event.loaded counts the multipart envelope too — cap at the file's own size.
      onProgress(Math.min(event.loaded, file.size))
    },
  })
}

async function resumableUpload(
  fileId: string,
  file: File,
  onProgress: (sentBytes: number) => void,
) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const { sessionId } = await apiClient.post<{ sessionId: string }>(
    '/api/v1/storage/upload/resumable',
    { fileId, totalChunks, fileSize: file.size },
  )

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const chunk = file.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE)
    const formData = new FormData()
    formData.append('chunk', chunk)
    await apiClient.put(
      `/api/v1/storage/upload/resumable/${sessionId}?chunkIndex=${chunkIndex}`,
      formData,
    )
    onProgress(Math.min((chunkIndex + 1) * CHUNK_SIZE, file.size))
  }

  await apiClient.post(`/api/v1/storage/upload/resumable/${sessionId}/complete`)
}

/**
 * Sends one PENDING file's bytes. storage-service marks it UPLOADED through its own
 * server-to-server callback to file-service once stored, so there's no third "mark uploaded"
 * call here — resolving means the callback succeeded too.
 */
export async function uploadBytes(
  fileId: string,
  file: File,
  onProgress: (sentBytes: number) => void,
) {
  if (file.size > RESUMABLE_THRESHOLD) {
    await resumableUpload(fileId, file, onProgress)
  } else {
    await simpleUpload(fileId, file, onProgress)
  }
}
