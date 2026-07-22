import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export const listDirectory = (path: string) =>
  apiClient.get<FileEntry[]>('/api/v1/directories', { params: { path } })

export function useDirectoryListing(path: string) {
  return useQuery({
    queryKey: ['directory', path],
    queryFn: () => listDirectory(path),
  })
}
