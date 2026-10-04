import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '@/types/file'

export const listTrash = () => apiClient.get<FileEntry[]>('/api/v1/files/trash')

export function useTrash() {
  return useQuery({
    queryKey: ['trash'],
    queryFn: listTrash,
  })
}
