import { create } from 'zustand'

type AlertState = {
  message: string | null
  show: (message: string) => void
  dismiss: () => void
}

/** A single global "확인 눌러야 닫히는" notice — set from anywhere (including right before a
 * navigate() away from the page that triggered it) and rendered once, at the app root, so it
 * survives the route change instead of unmounting with whatever component called show(). */
export const useAlertStore = create<AlertState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  dismiss: () => set({ message: null }),
}))
