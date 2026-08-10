import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import type { ApiResponse } from '@/types/api'

export const ACCESS_TOKEN_STORAGE_KEY = 'modudrive.accessToken'
export const REFRESH_TOKEN_STORAGE_KEY = 'modudrive.refreshToken'

// The response interceptor below unwraps `response.data.data`, so every
// request actually resolves with the payload `T`, not `AxiosResponse<T>`.
// This augmentation makes the axios types match that runtime behavior.
declare module 'axios' {
  interface AxiosInstance {
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
    post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  }
  interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
}

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
})

apiClient.interceptors.request.use(authRequestInterceptor)

// Plain `fetch` on purpose: apiClient's interceptors would route a failed
// reissue call back through the 401 handler below and deadlock on itself.
async function reissueAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  const res = await fetch(`${env.API_BASE_URL}/api/v1/auth/reissue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) {
    throw new Error('Failed to reissue access token')
  }

  const { data } = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>
  const { useAuthStore } = await import('@/stores/auth-store')
  useAuthStore.getState().login(data.accessToken, data.refreshToken)
  return data.accessToken
}

// Deduped in-flight reissue: concurrent 401s from parallel requests must share
// one reissue, since the backend rotates the refresh token on every call and
// a second reissue with the now-stale token would fail.
let refreshPromise: Promise<string> | null = null

function getRefreshedAccessToken(): Promise<string> {
  refreshPromise ??= reissueAccessToken().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    return response.data.data as AxiosResponse
  },
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const accessToken = await getRefreshedAccessToken()
        originalRequest.headers.set('Authorization', `Bearer ${accessToken}`)
        return apiClient(originalRequest)
      } catch {
        const { useAuthStore } = await import('@/stores/auth-store')
        useAuthStore.getState().logout()
      }
    } else if (error.response?.status === 401) {
      const { useAuthStore } = await import('@/stores/auth-store')
      useAuthStore.getState().logout()
    }

    const message = error.response?.data?.message ?? error.message
    return Promise.reject(new Error(message))
  },
)
