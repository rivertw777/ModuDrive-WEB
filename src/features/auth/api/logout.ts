import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

// No body: auth-service reads the refresh token from the httpOnly cookie and
// the access token from the Authorization header (attached by apiClient).
const logout = () => apiClient.post<void>('/api/v1/auth/logout')

export function useLogout() {
  return useMutation({
    mutationFn: logout,
    // Clear local state even if the backend call fails (e.g. offline) — the
    // user should still be able to leave the app.
    onSettled: () => {
      useAuthStore.getState().logout()
    },
  })
}
