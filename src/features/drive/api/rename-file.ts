import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export type RenameFileInput = {
  fileId: string
  name: string
}

export const renameFile = ({ fileId, name }: RenameFileInput) =>
  apiClient.patch<FileEntry>(`/api/v1/files/${encodeURIComponent(fileId)}/name`, { name })

export function useRenameFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: renameFile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directory'] })
      // recent / category / all + search results + favorites also render this file's name
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      // 공유 문서함 / 공유 폴더 안 — a folder EDITOR renames from here
      queryClient.invalidateQueries({ queryKey: ['shared-with-me'] })
      queryClient.invalidateQueries({ queryKey: ['shared-directory'] })
      queryClient.invalidateQueries({ queryKey: ['file', variables.fileId] })
    },
  })
}
