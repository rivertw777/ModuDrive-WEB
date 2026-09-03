import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export type RenameFileInput = {
  fileId: string
  name: string
}

export const renameFile = ({ fileId, name }: RenameFileInput) =>
  apiClient.patch<FileEntry>(`/api/v1/files/${encodeURIComponent(fileId)}/name`, { name })

export function useRenameFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: renameFile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directory'] })
      // recent / category / all + search results + favorites also render this file's name
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      queryClient.invalidateQueries({ queryKey: ['file', variables.fileId] })
    },
  })
}
