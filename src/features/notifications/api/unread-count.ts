import { useQuery } from '@tanstack/react-query'
import { NOTIFICATION_POLL_INTERVAL_MS, listNotifications } from './list-notifications'

/** The backend has no dedicated count endpoint, so ask for a single unread row and read
 * `totalElements` off the page. */
export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => listNotifications({ unreadOnly: true, page: 0, size: 1 }),
    select: (page) => page.totalElements,
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
    enabled,
  })
}
