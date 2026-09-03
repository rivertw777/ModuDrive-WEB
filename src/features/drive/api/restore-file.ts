import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export const restoreFile = (fileId: string) =>
  apiClient.patch<FileEntry>(`/api/v1/files/${encodeURIComponent(fileId)}/restore`)

export function useRestoreFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: restoreFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      queryClient.invalidateQueries({ queryKey: ['directory'] })
      // ['files'] prefix covers usage + the recent / category / all views; recent filters out
      // DELETED, so the restored file reappears at its original accessedAt position
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}
