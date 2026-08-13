import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileAccessList, ShareScope } from '../types'

export type UpdateFileScopeInput = {
  fileId: string
  scope: ShareScope
}

export const updateFileScope = ({ fileId, scope }: UpdateFileScopeInput) =>
  apiClient.put<Pick<FileAccessList, 'fileId' | 'scope' | 'linkToken'>>(
    `/api/v1/files/${encodeURIComponent(fileId)}/scope`,
    { scope },
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
