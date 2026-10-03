import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { alertActionError } from '@/stores/alert-store'

// No body: auth-service reads the session from the HttpOnly cookie and clears it.
const logout = () => apiClient.post<void>('/api/v1/auth/logout')

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Drop cached file lists/favorites so the next login (possibly a
      // different account) doesn't start from this user's stale cache.
      queryClient.clear()
      useAuthStore.getState().setAnonymous('signed-out')
    },
    // Only the server can end the session — the cookie is HttpOnly, so JS can't clear it. Showing
    // "logged out" after a failed call would leave a live session behind (e.g. on a shared PC).
    onError: alertActionError,
  })
}
