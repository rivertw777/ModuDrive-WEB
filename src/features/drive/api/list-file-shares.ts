import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileAccessList } from '../types'

export const listFileShares = (fileId: string) =>
  apiClient.get<FileAccessList>(`/api/v1/files/${encodeURIComponent(fileId)}/shares`)

export function useFileShares(fileId: string, enabled = true) {
  return useQuery({
    queryKey: ['file-shares', fileId],
    queryFn: () => listFileShares(fileId),
    enabled,
  })
}
