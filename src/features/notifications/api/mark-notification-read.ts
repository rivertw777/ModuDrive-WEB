import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Notification } from '../types'

export const markNotificationRead = (id: string) =>
  apiClient.patch<Notification>(`/api/v1/notifications/${encodeURIComponent(id)}/read`)

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    // Both the list pages and the unread badge sit under this key prefix.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
