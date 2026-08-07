import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileCategory, FileEntry } from '../types'

export const listFilesByCategory = (type: FileCategory) =>
  apiClient.get<FileEntry[]>('/api/v1/files/category', { params: { type } })

export function useFilesByCategory(type: FileCategory) {
  return useQuery({
    queryKey: ['files', 'category', type],
    queryFn: () => listFilesByCategory(type),
  })
}
