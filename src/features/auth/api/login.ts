import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

export type LoginInput = {
  email: string
  password: string
}

type LoginResponse = {
  accessToken: string
  grantType: string
  issuedAt: string
}

export const login = (input: LoginInput) => apiClient.post<LoginResponse>('/api/v1/auth/login', input)

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      useAuthStore.getState().login(data.accessToken)
    },
  })
}
