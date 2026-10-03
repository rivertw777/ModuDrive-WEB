import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { notifyServerError } from '@/stores/alert-store'

export type ConfirmEmailVerificationInput = {
  email: string
  code: string
}

export const confirmEmailVerification = (input: ConfirmEmailVerificationInput) =>
  apiClient.post<void>('/api/v1/member/verify-email/confirm', input)

export function useConfirmEmailVerification() {
  return useMutation({ mutationFn: confirmEmailVerification, onError: (error: Error) => notifyServerError(error) })
}
