import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export type RenameFileInput = {
  fileId: string
  name: string
}

export const renameFile = ({ fileId, name }: RenameFileInput) =>
  apiClient.patch<FileEntry>(`/api/v1/files/${fileId}/name`, { name })

export function useRenameFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: renameFile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directory'] })
      queryClient.invalidateQueries({ queryKey: ['file', variables.fileId] })
    },
  })
}
