import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { notifyServerError } from '@/stores/alert-store'

export const requestEmailVerification = (email: string) =>
  apiClient.post<void>('/api/v1/member/verify-email/request', { email })

export function useRequestEmailVerification() {
  return useMutation({ mutationFn: requestEmailVerification, onError: (error: Error) => notifyServerError(error) })
}
