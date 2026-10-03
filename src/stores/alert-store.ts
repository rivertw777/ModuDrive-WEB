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

export const SERVER_ERROR_MESSAGE = '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'

const statusOf = (error: unknown) => (error as { status?: number } | undefined)?.status

/** A 5xx, or no response at all: the server couldn't answer. */
export function isServerError(error: unknown): boolean {
  const status = statusOf(error)
  return !status || status >= 500
}

/** 5xx / no response → the common alert. Returns whether it showed one. */
export function notifyServerError(error: unknown): boolean {
  if (!isServerError(error)) return false
  useAlertStore.getState().show(SERVER_ERROR_MESSAGE)
  return true
}

/** Splits a failed user action (click, drop, submit): a 5xx goes to the common alert and this
 * returns null; a 4xx carries something the user can act on (name taken, no access, too large…)
 * so its message is returned for the caller to show in red text next to the action. A 401 returns
 * null too — api-client already shows the session-expired notice for it. */
export function actionErrorText(error: unknown): string | null {
  if (statusOf(error) === 401 || notifyServerError(error)) return null
  return error instanceof Error ? error.message : null
}

/** Same split for an action with no room for red text (a star, a menu item): a 4xx's message goes
 * in the alert too. */
export function alertActionError(error: unknown) {
  const text = actionErrorText(error)
  if (text) useAlertStore.getState().show(text)
}
