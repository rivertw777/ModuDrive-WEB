import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileVersion } from '../types'

export const getFileRevisions = (fileId: string) =>
  apiClient.get<FileVersion[]>(`/api/v1/files/${encodeURIComponent(fileId)}/revisions`)

export function useFileRevisions(fileId: string | null) {
  return useQuery({
    queryKey: ['file', fileId, 'revisions'],
    queryFn: () => getFileRevisions(fileId as string),
    enabled: fileId !== null,
  })
}
