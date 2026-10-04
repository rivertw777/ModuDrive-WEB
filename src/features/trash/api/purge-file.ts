import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export const purgeFile = (fileId: string) =>
  apiClient.delete<void>(`/api/v1/files/${encodeURIComponent(fileId)}/purge`)

export function usePurgeFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: purgeFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      queryClient.invalidateQueries({ queryKey: ['files', 'usage'] })
    },
  })
}
