import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export type MoveFileInput = {
  fileId: string
  path: string
}

export const moveFile = ({ fileId, path }: MoveFileInput) =>
  apiClient.patch<FileEntry>(`/api/v1/files/${encodeURIComponent(fileId)}/path`, { path })

export function useMoveFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moveFile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directory'] })
      // recent / category / all + search results + favorites show this file's location, which just changed
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      queryClient.invalidateQueries({ queryKey: ['file', variables.fileId] })
      // Moving a folder changes the ancestor chain for its entire subtree — every descendant's
      // ShareModal (inheritedLinks/inheritedShares, computed from live ancestor state) can go
      // stale. Not scoped to variables.fileId; see update-file-scope.ts's onSuccess.
      queryClient.invalidateQueries({ queryKey: ['file-shares'] })
    },
  })
}
