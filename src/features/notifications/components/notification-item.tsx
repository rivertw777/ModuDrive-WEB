import { cn } from '@/utils/cn'
import { EntryIcon } from '@/features/drive'
import { formatRelativeTime, roleLabel, sharerLabel, type Notification } from '../types'

/** One row, shared by the bell dropdown and the full page. `onSelect` marks it read and
 * navigates to the file — the caller owns both since the dropdown also has to close itself. */
export function NotificationItem({
  notification,
  onSelect,
}: {
  notification: Notification
  onSelect: (notification: Notification) => void
}) {
  const sharer = sharerLabel(notification)
  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60',
        !notification.read && 'bg-brand-50/60 dark:bg-brand-950/40',
      )}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
        <EntryIcon name={notification.fileName} directory={notification.directory} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-slate-700 dark:text-slate-200">
          {sharer && <span className="font-semibold">{sharer}</span>}
          {sharer ? '님이 ' : ''}
          <span className="font-semibold">{notification.fileName}</span>{' '}
          {notification.directory ? '폴더를' : '파일을'} 공유했습니다
        </span>
        <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
          {roleLabel(notification.role)} 권한 · {formatRelativeTime(notification.createdAt)}
        </span>
      </span>
      {!notification.read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600 dark:bg-brand-400" />
      )}
    </button>
  )
}
