import { useState } from 'react'
import { useInfiniteScrollRef } from '@/hooks/use-windowed-list'
import { BellIcon } from '@/components/ui/icons'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { PageHeader } from '@/components/ui/page-header'
import { useNotifications } from '../api/list-notifications'
import { useOpenNotification } from '../hooks/use-open-notification'
import { NotificationItem } from './notification-item'

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotifications(unreadOnly)
  const openNotification = useOpenNotification()

  const notifications = data?.pages.flatMap((page) => page.content) ?? []
  const sentinelRef = useInfiniteScrollRef(
    !!hasNextPage,
    () => void fetchNextPage(),
    isFetchingNextPage,
  )

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <PageHeader title="알림">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="size-4 rounded border-slate-300 dark:border-slate-600"
            />
            안 읽은 알림만
          </label>
        </PageHeader>

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

          {hasNextPage && <div ref={sentinelRef} aria-hidden className="h-8" />}
          {isFetchingNextPage && (
            <p role="status" className="py-3 text-center text-sm text-slate-400 dark:text-slate-500">
              불러오는 중...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
