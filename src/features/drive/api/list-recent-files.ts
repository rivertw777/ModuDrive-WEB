import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '@/types/file'

export const listRecentFiles = () => apiClient.get<FileEntry[]>('/api/v1/files/recent')

export function useRecentFiles() {
  return useQuery({
    queryKey: ['files', 'recent'],
    queryFn: listRecentFiles,
  })
}
