import { useQuery } from '@tanstack/react-query'
import { listNotifications } from './list-notifications'

/** The backend has no dedicated count endpoint, so ask for a single unread row and read
 * `totalElements` off the page. No SSE/websocket on the backend either — poll every 30s. */
export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => listNotifications({ unreadOnly: true, page: 0, size: 1 }),
    select: (page) => page.totalElements,
    refetchInterval: 30_000,
    enabled,
  })
}
