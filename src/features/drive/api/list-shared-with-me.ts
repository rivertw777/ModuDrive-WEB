import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export const listSharedWithMe = () => apiClient.get<FileEntry[]>('/api/v1/files/shared-with-me')

export function useSharedWithMe() {
  return useQuery({
    queryKey: ['shared-with-me'],
    queryFn: listSharedWithMe,
  })
}
