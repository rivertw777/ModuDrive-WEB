import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export const deleteFile = (fileId: string) =>
  apiClient.delete<void>(`/api/v1/files/${encodeURIComponent(fileId)}`)

export function useDeleteFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] })
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}
