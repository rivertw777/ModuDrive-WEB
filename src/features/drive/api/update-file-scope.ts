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
    onSuccess: () => {
      // Not scoped to this fileId: a folder's scope change changes every descendant's *inherited*
      // access too (see PublicFileResolver/ListFileSharesService), and the client has no way to
      // know which cached ['file-shares', <other id>] queries that reaches — invalidate the whole
      // family so a ShareModal reopened on any of them (e.g. a child within the 60s staleTime
      // window) doesn't act on stale inheritedLinks/scope.
      queryClient.invalidateQueries({ queryKey: ['file-shares'] })
    },
  })
}
