import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export type MoveFileInput = {
  fileId: string
  path: string
}

export const moveFile = ({ fileId, path }: MoveFileInput) =>
  apiClient.patch<FileEntry>(`/api/v1/files/${fileId}/path`, { path })

export function useMoveFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moveFile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directory'] })
      queryClient.invalidateQueries({ queryKey: ['file', variables.fileId] })
    },
  })
}
