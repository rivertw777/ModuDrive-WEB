import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

export type LoginInput = {
  email: string
  password: string
}

/** `verificationRequired`: a device this account hasn't verified — no session yet, an emailed
 * 6-digit code comes next (API spec 004 2-1). The session id itself only ever arrives as an
 * HttpOnly cookie. */
export type LoginResult = { verificationRequired: boolean }

// `undefined` from an API older than 2-1 (no body): treated as signed in.
export const login = (input: LoginInput) =>
  apiClient.post<LoginResult | undefined>('/api/v1/auth/login', input)

export const verifyLogin = (code: string) =>
  apiClient.post<void>('/api/v1/auth/login/verify', { code })

function signIn(queryClient: QueryClient) {
  // Drop any cached data from a previously logged-in account so a
  // switched-account session doesn't briefly show the old user's files.
  queryClient.clear()
  useAuthStore.getState().setAuthenticated()
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      if (!result?.verificationRequired) signIn(queryClient)
    },
  })
}

export function useVerifyLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: verifyLogin,
    onSuccess: () => signIn(queryClient),
  })
}
