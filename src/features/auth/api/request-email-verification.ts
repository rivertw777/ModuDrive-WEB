import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export const requestEmailVerification = (email: string) =>
  apiClient.post<void>('/api/v1/member/verify-email/request', { email })

export function useRequestEmailVerification() {
  return useMutation({ mutationFn: requestEmailVerification })
}
