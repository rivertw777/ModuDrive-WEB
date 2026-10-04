import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '@/types/file'

export const listFavorites = () => apiClient.get<FileEntry[]>('/api/v1/files/favorites')

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: listFavorites,
  })
}
