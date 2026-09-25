import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { useAlertStore } from '@/stores/alert-store'

vi.mock('@/lib/api-client', () => ({ apiClient: { post: vi.fn() } }))

const { apiClient } = await import('@/lib/api-client')
const { useLogout } = await import('./logout')

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

describe('useLogout', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset()
    useAuthStore.setState({ status: 'authenticated' })
    useAlertStore.setState({ message: null })
  })

  it('switches to anonymous once the server has ended the session', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(undefined)
    const { result } = renderHook(() => useLogout(), { wrapper })

    result.current.mutate()

    await waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'))
  })

  it('stays logged in and says so when the server call fails — the HttpOnly cookie is still live', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(Object.assign(new Error('unavailable'), { status: 503 }))
    const { result } = renderHook(() => useLogout(), { wrapper })

    result.current.mutate()

    await waitFor(() => expect(useAlertStore.getState().message).not.toBeNull())
    expect(useAuthStore.getState().status).toBe('authenticated')
  })
})
