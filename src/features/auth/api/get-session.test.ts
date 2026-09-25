import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }))

const { apiClient } = await import('@/lib/api-client')
const { useSessionBootstrap } = await import('./get-session')

describe('useSessionBootstrap', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    useAuthStore.setState({ status: 'checking' })
    localStorage.clear()
  })

  it('marks the session authenticated when the server recognizes the cookie', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ memberId: 'm-1' })

    renderHook(() => useSessionBootstrap())

    await waitFor(() => expect(useAuthStore.getState().status).toBe('authenticated'))
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/auth/session')
  })

  it('marks the session anonymous when the server rejects it', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(Object.assign(new Error('로그인이 필요합니다.'), { status: 401 }))

    renderHook(() => useSessionBootstrap())

    await waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'))
  })

  it('keeps checking and retries when the server is unreachable instead of assuming logged out', async () => {
    vi.useFakeTimers()
    vi.mocked(apiClient.get)
      .mockRejectedValueOnce(Object.assign(new Error('Network Error'), { status: undefined }))
      .mockResolvedValueOnce({ memberId: 'm-1' })

    renderHook(() => useSessionBootstrap())
    await vi.advanceTimersByTimeAsync(0)
    expect(useAuthStore.getState().status).toBe('checking')

    await vi.advanceTimersByTimeAsync(3_000)
    expect(useAuthStore.getState().status).toBe('authenticated')
    vi.useRealTimers()
  })

  it('removes the access token the JWT-era client left in localStorage', async () => {
    localStorage.setItem('modudrive.accessToken', 'stale-jwt')
    vi.mocked(apiClient.get).mockResolvedValue({ memberId: 'm-1' })

    renderHook(() => useSessionBootstrap())

    expect(localStorage.getItem('modudrive.accessToken')).toBeNull()
    await waitFor(() => expect(useAuthStore.getState().status).toBe('authenticated'))
  })
})
