/** Mirrors NotificationResponse in ModuDrive-API's notification-service. `createdAt` is an
 * ISO-8601 string (Jackson serializes the backend's LocalDateTime without a zone). */
export type Notification = {
  id: string
  fileId: string
  fileName: string
  role: string
  /** Whether the shared item is a folder — drives the "폴더/파일" wording and the row icon. */
  directory: boolean
  /** Name/email of the member who shared the file. Null when the backend could not resolve them. */
  sharerName: string | null
  sharerEmail: string | null
  read: boolean
  createdAt: string
}

const ROLE_LABEL: Record<string, string> = {
  VIEWER: '뷰어',
  EDITOR: '편집자',
}

/** Same wording as drive's role-select, kept local so this feature doesn't reach into drive. */
export const roleLabel = (role: string) => ROLE_LABEL[role] ?? role

/** The sharer's email; falls back to their name only if the email is unknown. Null when neither is. */
export function sharerLabel(notification: Pick<Notification, 'sharerName' | 'sharerEmail'>): string | null {
  return notification.sharerEmail || notification.sharerName || null
}

const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

/** "3분 전", "2일 전"... falls back to "방금 전" under a minute. */
export function formatRelativeTime(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  if (seconds < 60) return '방금 전'
  for (const [unit, secondsPerUnit] of UNITS) {
    if (seconds >= secondsPerUnit) return rtf.format(-Math.floor(seconds / secondsPerUnit), unit)
  }
  return '방금 전'
}
