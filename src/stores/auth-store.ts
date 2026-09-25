import { create } from 'zustand'

/**
 * Whether the browser holds a live session. The session itself is an HttpOnly cookie the page
 * can't read (API spec 004), so this is all the client knows: `checking` until the startup
 * `GET /api/v1/auth/session` answers, then `authenticated` or `anonymous`.
 */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

type AuthState = {
  status: AuthStatus
  setAuthenticated: () => void
  setAnonymous: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  setAuthenticated: () => set({ status: 'authenticated' }),
  setAnonymous: () => set({ status: 'anonymous' }),
}))
