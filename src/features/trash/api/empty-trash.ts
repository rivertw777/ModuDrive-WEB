import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export const emptyTrash = () => apiClient.delete<void>('/api/v1/files/trash')

export function useEmptyTrash() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: emptyTrash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      queryClient.invalidateQueries({ queryKey: ['files', 'usage'] })
    },
  })
}
