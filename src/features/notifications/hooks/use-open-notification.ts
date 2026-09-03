import { useNavigate } from 'react-router-dom'
import { useMarkNotificationRead } from '../api/mark-notification-read'
import type { Notification } from '../types'

/** Shared click behaviour for a notification: mark it read (if unread) and open the file in
 * 공유 문서함 with its detail panel selected — same result as finding the file there and clicking it. */
export function useOpenNotification() {
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()

  return (notification: Notification) => {
    if (!notification.read) markRead.mutate(notification.id)
    navigate(`/shared?file=${encodeURIComponent(notification.fileId)}`)
  }
}
