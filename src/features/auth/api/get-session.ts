import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

/** Left behind by the JWT-era client; the session cookie replaced it (API issue #430). */
const LEGACY_ACCESS_TOKEN_KEY = 'modudrive.accessToken'
const RETRY_DELAY_MS = 3_000

export const getSession = () => apiClient.get<{ memberId: string }>('/api/v1/auth/session')

/** Resolves `checking` into `authenticated`/`anonymous` once per page load — the HttpOnly session
 * cookie can't be read from JS, so asking the server is the only way to know. Only a 401 means
 * "no session"; a network error or 503 says nothing about the session, so it keeps `checking` and
 * asks again rather than sending a logged-in user to the login screen. */
export function useSessionBootstrap() {
  useEffect(() => {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY)
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const check = () =>
      getSession().then(
        () => useAuthStore.getState().setAuthenticated(),
        (error: { status?: number }) => {
          if (error.status === 401) useAuthStore.getState().setAnonymous()
          else retryTimer = setTimeout(check, RETRY_DELAY_MS)
        },
      )
    check()
    return () => clearTimeout(retryTimer)
  }, [])
}
