import { create } from 'zustand'

/**
 * Whether the browser holds a live session. The session itself is an HttpOnly cookie the page
 * can't read (API spec 004), so this is all the client knows: `checking` until the startup
 * `GET /api/v1/auth/session` answers, then `authenticated` or `anonymous`.
 */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

/** Why the status is `anonymous`: no session when the page loaded, a live one that expired, or
 * the user logged out. Decides which notice (if any) goes with the trip to the login screen. */
export type AnonymousReason = 'no-session' | 'expired' | 'signed-out'

type AuthState = {
  status: AuthStatus
  anonymousReason: AnonymousReason | null
  setAuthenticated: () => void
  setAnonymous: (reason: AnonymousReason) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  anonymousReason: null,
  setAuthenticated: () => set({ status: 'authenticated', anonymousReason: null }),
  setAnonymous: (reason) => set({ status: 'anonymous', anonymousReason: reason }),
}))
