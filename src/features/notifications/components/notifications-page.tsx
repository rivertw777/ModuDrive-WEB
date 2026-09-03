import { useState } from 'react'
import { BellIcon } from '@/components/ui/icons'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { useNotifications } from '../api/list-notifications'
import { useOpenNotification } from '../hooks/use-open-notification'
import { NotificationItem } from './notification-item'

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotifications(unreadOnly)
  const openNotification = useOpenNotification()

  const notifications = data?.pages.flatMap((page) => page.content) ?? []

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <div className="flex shrink-0 items-center justify-between pb-4">
          <h1 className="text-lg font-medium text-slate-900 dark:text-slate-100">알림</h1>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="size-4 rounded border-slate-300 dark:border-slate-600"
            />
            안 읽은 알림만
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="알림을 불러오지 못했습니다" />}
          {!isLoading && !isError && notifications.length === 0 && (
            <EmptyState label={unreadOnly ? '안 읽은 알림이 없습니다' : '알림이 없습니다'} icon={BellIcon} />
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={openNotification}
              />
            ))}
          </div>

          {hasNextPage && (
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full py-3 text-sm font-medium text-brand-600 hover:bg-slate-50 disabled:opacity-50 dark:text-brand-400 dark:hover:bg-slate-700/50"
            >
              {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
