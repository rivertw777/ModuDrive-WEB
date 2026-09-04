import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellIcon } from '@/components/ui/icons'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { NOTIFICATION_POLL_INTERVAL_MS, useNotifications } from '../api/list-notifications'
import { useUnreadNotificationCount } from '../api/unread-count'
import { useOpenNotification } from '../hooks/use-open-notification'
import { NotificationItem } from './notification-item'

/** How many rows the dropdown shows before "전체 보기" — the full list lives at /notifications. */
const PREVIEW_COUNT = 8

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: unreadCount } = useUnreadNotificationCount()
  // Dropdown is an unread inbox: once a notification is opened (→ marked read) it drops off
  // the bell. The full history stays on /notifications. Always mounted in the header (not just
  // while open), so it needs its own poll to pick up new notifications — nothing else invalidates
  // this query when one arrives.
  const { data, isLoading, isError } = useNotifications(true, NOTIFICATION_POLL_INTERVAL_MS)
  const openNotification = useOpenNotification()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const notifications = data?.pages.flatMap((page) => page.content).slice(0, PREVIEW_COUNT) ?? []
  const badge =
    unreadCount && unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="알림"
        className="relative inline-flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
      >
        <BellIcon size={21} />
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            알림
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && <LoadingState />}
            {isError && <ErrorState message="알림을 불러오지 못했습니다" />}
            {!isLoading && !isError && notifications.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                새로운 알림이 없습니다
              </p>
            )}
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                showUnreadDot={false}
                onSelect={(n) => {
                  setOpen(false)
                  openNotification(n)
                }}
              />
            ))}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-brand-600 hover:bg-slate-50 dark:border-slate-700 dark:text-brand-400 dark:hover:bg-slate-700/50"
          >
            전체 보기
          </Link>
        </div>
      )}
    </div>
  )
}
