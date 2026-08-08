import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export type UploadFileInput = {
  file: File
  path: string
  onProgress?: (percent: number) => void
}

// storage-service marks the file UPLOADED via its own server-to-server callback
// to file-service once the upload completes, so no third "mark uploaded" call is needed here.

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
// Above this, upload in chunks via the resumable endpoints instead of one request
// holding the whole file in memory/formdata.
const RESUMABLE_THRESHOLD = 20 * 1024 * 1024 // 20MB

async function simpleUpload(fileId: string, file: File, onProgress?: (percent: number) => void) {
  const formData = new FormData()
  formData.append('file', file)
  await apiClient.post(`/api/v1/storage/upload?fileId=${fileId}`, formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    },
  })
}

async function resumableUpload(fileId: string, file: File, onProgress?: (percent: number) => void) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const { sessionId } = await apiClient.post<{ sessionId: string }>('/api/v1/storage/upload/resumable', {
    fileId,
    totalChunks,
  })

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const chunk = file.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE)
    const formData = new FormData()
    formData.append('chunk', chunk)
    await apiClient.put(`/api/v1/storage/upload/resumable/${sessionId}?chunkIndex=${chunkIndex}`, formData)
    onProgress?.(Math.round(((chunkIndex + 1) / totalChunks) * 100))
  }

  await apiClient.post(`/api/v1/storage/upload/resumable/${sessionId}/complete`)
}

async function uploadFile({ file, path, onProgress }: UploadFileInput, queryClient: QueryClient) {
  const metadata = await apiClient.post<FileEntry>('/api/v1/files/metadata', {
    name: file.name,
    path,
    directory: false,
  })
  // Reflect the file in the list as soon as its record exists, instead of
  // waiting for the (potentially slow) byte transfer below to finish —
  // this is what makes an upload appear immediately, the same as a folder.
  queryClient.invalidateQueries({ queryKey: ['directory', path] })

  if (file.size > RESUMABLE_THRESHOLD) {
    await resumableUpload(metadata.fileId, file, onProgress)
  } else {
    await simpleUpload(metadata.fileId, file, onProgress)
  }

  return metadata
}

export function useUploadFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UploadFileInput) => uploadFile(input, queryClient),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directory', variables.path] })
      queryClient.invalidateQueries({ queryKey: ['files', 'usage'] })
    },
  })
}
