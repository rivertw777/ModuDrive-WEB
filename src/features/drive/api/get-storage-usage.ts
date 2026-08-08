import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type StorageUsage = {
  usedBytes: number
  quotaBytes: number
}

export const getStorageUsage = () => apiClient.get<StorageUsage>('/api/v1/files/usage')

export function useStorageUsage(enabled = true) {
  return useQuery({
    queryKey: ['files', 'usage'],
    queryFn: getStorageUsage,
    enabled,
  })
}
