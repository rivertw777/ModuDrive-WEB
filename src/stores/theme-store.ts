import { create } from 'zustand'

const THEME_STORAGE_KEY = 'modudrive.theme'

type Theme = 'light' | 'dark'

type ThemeState = {
  theme: Theme
  toggle: () => void
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    apply(next)
    set({ theme: next })
  },
}))
