import { useMutation } from '@tanstack/react-query'
import { apiClient, ACCESS_TOKEN_STORAGE_KEY } from '@/lib/api-client'

export type LoginInput = {
  email: string
  password: string
}

type LoginResponse = {
  accessToken: string
  refreshToken: string
  grantType: string
  issuedAt: string
}

export const login = (input: LoginInput) => apiClient.post<LoginResponse>('/api/v1/auth/login', input)

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.accessToken)
    },
  })
}
