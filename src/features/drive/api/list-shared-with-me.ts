import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '@/types/file'

export const listSharedWithMe = () => apiClient.get<FileEntry[]>('/api/v1/files/shared-with-me')

export function useSharedWithMe() {
  return useQuery({
    queryKey: ['shared-with-me'],
    queryFn: listSharedWithMe,
  })
}
