import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export const getFile = (fileId: string) => apiClient.get<FileEntry>(`/api/v1/files/${fileId}`)

export function useFile(fileId: string | null) {
  return useQuery({
    queryKey: ['file', fileId],
    queryFn: () => getFile(fileId as string),
    enabled: fileId !== null,
  })
}
