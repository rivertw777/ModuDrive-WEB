import { useInfiniteQuery } from '@tanstack/react-query'
import { BACKGROUND_REQUEST_HEADERS, apiClient } from '@/lib/api-client'
import type { Notification } from '../types'

/** One page of `GET /api/v1/notifications`. The backend returns a Spring `Page`, so paging is
 * by page number (`number`) rather than a cursor; `last` marks the final page. */
export type NotificationPage = {
  content: Notification[]
  number: number
  last: boolean
  totalElements: number
}

export const PAGE_SIZE = 20

/** No SSE/websocket on the backend, so the header bell polls at this interval. */
export const NOTIFICATION_POLL_INTERVAL_MS = 30_000

export const listNotifications = (opts: {
  unreadOnly?: boolean
  page?: number
  size?: number
  /** Polling, not the user — must not keep an idle session alive. */
  background?: boolean
}) =>
  apiClient.get<NotificationPage>('/api/v1/notifications', {
    headers: opts.background ? BACKGROUND_REQUEST_HEADERS : undefined,
    params: {
      unreadOnly: opts.unreadOnly ?? false,
      page: opts.page ?? 0,
      size: opts.size ?? PAGE_SIZE,
    },
  })

export function useNotifications(unreadOnly = false, refetchInterval?: number) {
  return useInfiniteQuery({
    queryKey: ['notifications', 'list', { unreadOnly }],
    queryFn: ({ pageParam }) =>
      listNotifications({ unreadOnly, page: pageParam, background: refetchInterval != null }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
    refetchInterval,
  })
}
