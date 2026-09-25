import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
  BACKGROUND_REQUEST_HEADERS: { 'X-Background-Request': 'true' },
}))

const { apiClient } = await import('@/lib/api-client')
const { listNotifications } = await import('./list-notifications')

describe('listNotifications', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.get).mockResolvedValue({ content: [], number: 0, last: true, totalElements: 0 })
  })

  it('marks a polling request as background so it cannot keep an idle session alive', async () => {
    await listNotifications({ unreadOnly: true, size: 1, background: true })

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/notifications',
      expect.objectContaining({ headers: { 'X-Background-Request': 'true' } }),
    )
  })

  it('sends a user-triggered request without the background header', async () => {
    await listNotifications({})

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/notifications',
      expect.objectContaining({ headers: undefined }),
    )
  })
})
