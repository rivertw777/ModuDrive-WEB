import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationBell } from './notification-bell'
import type { Notification } from '../types'

vi.mock('../api/list-notifications', () => ({ useNotifications: vi.fn() }))
vi.mock('../api/unread-count', () => ({ useUnreadNotificationCount: vi.fn() }))
vi.mock('../hooks/use-open-notification', () => ({ useOpenNotification: vi.fn() }))

const { useNotifications } = await import('../api/list-notifications')
const { useUnreadNotificationCount } = await import('../api/unread-count')
const { useOpenNotification } = await import('../hooks/use-open-notification')

const notification = (over: Partial<Notification> = {}): Notification => ({
  id: 'n1',
  fileId: 'f1',
  fileName: 'report.pdf',
  role: 'VIEWER',
  directory: false,
  sharerName: '홍길동',
  sharerEmail: 'owner@modudrive.com',
  read: false,
  createdAt: new Date().toISOString(),
  ...over,
})

function renderBell() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NotificationBell', () => {
  const open = vi.fn()

  beforeEach(() => {
    vi.mocked(useOpenNotification).mockReturnValue(open)
    vi.mocked(useUnreadNotificationCount).mockReturnValue({ data: 3 } as ReturnType<
      typeof useUnreadNotificationCount
    >)
    vi.mocked(useNotifications).mockReturnValue({
      data: { pages: [{ content: [notification()], number: 0, last: true, totalElements: 1 }] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNotifications>)
    open.mockReset()
  })

  it('shows the unread count on the badge', () => {
    renderBell()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('caps the badge at 99+', () => {
    vi.mocked(useUnreadNotificationCount).mockReturnValue({ data: 150 } as ReturnType<
      typeof useUnreadNotificationCount
    >)
    renderBell()
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('opens the panel and lists notifications', async () => {
    renderBell()
    const user = userEvent.setup()

    expect(screen.queryByText(/report\.pdf/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '알림' }))
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
  })

  it('opens the notification and closes the panel on click', async () => {
    renderBell()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '알림' }))
    await user.click(screen.getByText('report.pdf'))

    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }))
    expect(screen.queryByText('전체 보기')).not.toBeInTheDocument()
  })
})
