import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileShare, Role } from '../types'

export type ShareFileInput = {
  fileId: string
  email: string
  role: Role
}

// Response data is null for a guest invite (no ModuDrive member owns the email) — the backend
// sent a no-login link instead of creating a FileShare row.
export const shareFile = ({ fileId, ...body }: ShareFileInput) =>
  apiClient.post<FileShare | null>(`/api/v1/files/${encodeURIComponent(fileId)}/shares`, body)

export function useShareFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: shareFile,
    onSuccess: () => {
      // Not scoped to this fileId — sharing a folder also changes what its descendants show as
      // "inherited" access (see update-file-scope.ts's onSuccess for the full reasoning).
      queryClient.invalidateQueries({ queryKey: ['file-shares'] })
    },
  })
}
