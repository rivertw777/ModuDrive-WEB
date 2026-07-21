import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type SignupInput = {
  name: string
  email: string
  password: string
}

export const signup = (input: SignupInput) => apiClient.post<void>('/api/v1/member/sign-up', input)

export function useSignup() {
  return useMutation({ mutationFn: signup })
}
