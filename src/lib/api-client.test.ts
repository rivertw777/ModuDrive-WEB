import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api-client'
import { useAlertStore } from '@/stores/alert-store'
import { useAuthStore } from '@/stores/auth-store'

const respondWith401: AxiosAdapter = (config: InternalAxiosRequestConfig) =>
  Promise.reject(
    new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
      data: { status: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
    }),
  )

describe('apiClient 401', () => {
  const originalAdapter = apiClient.defaults.adapter

  beforeEach(() => {
    apiClient.defaults.adapter = respondWith401
    useAlertStore.setState({ message: null })
  })
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it('tells a signed-in user their session expired, once, and signs them out', async () => {
    useAuthStore.setState({ status: 'authenticated' })
    const show = vi.spyOn(useAlertStore.getState(), 'show')

    await Promise.allSettled([apiClient.get('/api/v1/files'), apiClient.get('/api/v1/notifications')])

    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(show).toHaveBeenCalledTimes(1)
    expect(useAlertStore.getState().message).toBe('로그인이 만료되었습니다. 다시 로그인해 주세요.')
    show.mockRestore()
  })

  it('stays quiet when there was no session to begin with (startup check)', async () => {
    useAuthStore.setState({ status: 'checking' })

    await apiClient.get('/api/v1/auth/session').catch(() => {})

    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(useAlertStore.getState().message).toBeNull()
  })
})
