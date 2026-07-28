import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export const searchFiles = (query: string) =>
  apiClient.get<FileEntry[]>('/api/v1/files/search', { params: { query } })

export function useSearchFiles(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchFiles(query),
    enabled: query.trim().length > 0,
  })
}
