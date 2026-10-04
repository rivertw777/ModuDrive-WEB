import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '@/types/file'

export const listAllFiles = () => apiClient.get<FileEntry[]>('/api/v1/files/all')

export function useAllFiles() {
  return useQuery({
    queryKey: ['files', 'all'],
    queryFn: listAllFiles,
  })
}
