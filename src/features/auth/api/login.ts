import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      // Drop any cached data from a previously logged-in account so a
      // switched-account session doesn't briefly show the old user's files.
      queryClient.clear()
      useAuthStore.getState().login(data.accessToken)
    },
  })
}
