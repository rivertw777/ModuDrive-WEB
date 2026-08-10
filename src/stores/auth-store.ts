import { create } from 'zustand'
import { ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from '@/lib/api-client'

type AuthState = {
  accessToken: string | null
  login: (accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY),
  login: (accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
    set({ accessToken })
  },
  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    set({ accessToken: null })
  },
}))
