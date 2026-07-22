import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type CurrentMember = {
  id: string
  name: string
  email: string
  isValid: boolean
}

export const getCurrentMember = () => apiClient.get<CurrentMember>('/api/v1/member/find')

export function useCurrentMember(enabled = true) {
  return useQuery({
    queryKey: ['member', 'me'],
    queryFn: getCurrentMember,
    enabled,
  })
}
