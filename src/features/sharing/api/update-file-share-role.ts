import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileShare } from '../types'
import type { Role } from '@/types/file'

export type UpdateFileShareRoleInput = {
  fileId: string
  shareId: string
  role: Role
}

export const updateFileShareRole = ({ fileId, shareId, role }: UpdateFileShareRoleInput) =>
  apiClient.patch<FileShare>(`/api/v1/files/${encodeURIComponent(fileId)}/shares/${encodeURIComponent(shareId)}`, {
    role,
  })

export function useUpdateFileShareRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateFileShareRole,
    onSuccess: () => {
      // Not scoped to this fileId — see update-file-scope.ts's onSuccess for the full reasoning.
      queryClient.invalidateQueries({ queryKey: ['file-shares'] })
    },
  })
}
