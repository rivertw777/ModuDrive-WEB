import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileAccessList, Role, ShareScope } from '../types'

export type UpdateFileScopeInput = {
  fileId: string
  scope: ShareScope
  /** Only meaningful when scope is LINK — the role given to link visitors. */
  role?: Role
}

export const updateFileScope = ({ fileId, scope, role }: UpdateFileScopeInput) =>
  apiClient.put<Pick<FileAccessList, 'fileId' | 'scope' | 'role' | 'linkToken'>>(
    `/api/v1/files/${encodeURIComponent(fileId)}/scope`,
    { scope, role },
  )

export function useUpdateFileScope() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateFileScope,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['file-shares', variables.fileId] })
    },
  })
}
