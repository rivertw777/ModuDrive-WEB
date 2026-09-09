import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type RevokeFileShareInput = {
  fileId: string
  shareId: string
}

export const revokeFileShare = ({ fileId, shareId }: RevokeFileShareInput) =>
  apiClient.delete<void>(`/api/v1/files/${encodeURIComponent(fileId)}/shares/${encodeURIComponent(shareId)}`)

export function useRevokeFileShare() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeFileShare,
    onSuccess: () => {
      // Not scoped to this fileId — see update-file-scope.ts's onSuccess for the full reasoning.
      queryClient.invalidateQueries({ queryKey: ['file-shares'] })
    },
  })
}
