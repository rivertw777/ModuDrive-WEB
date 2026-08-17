import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import type { ApiResponse } from '@/types/api'

export const ACCESS_TOKEN_STORAGE_KEY = 'modudrive.accessToken'

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
  // refresh_token now lives in an httpOnly cookie (set by auth-service on
  // login/reissue) rather than in a request body — this makes every request,
  // including the plain `fetch` below, actually send it cross-origin.
  withCredentials: true,
})

apiClient.interceptors.request.use(authRequestInterceptor)

// Plain `fetch` on purpose: apiClient's interceptors would route a failed
// reissue call back through the 401 handler below and deadlock on itself.
async function reissueAccessToken(): Promise<string> {
  const res = await fetch(`${env.API_BASE_URL}/api/v1/auth/reissue`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error('Failed to reissue access token')
  }

  const { data } = (await res.json()) as ApiResponse<{ accessToken: string }>
  const { useAuthStore } = await import('@/stores/auth-store')
  useAuthStore.getState().login(data.accessToken)
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
    // status carried through so callers can branch on "not found" vs. other failures
    // without re-parsing the (locale-specific) message text — see check-member-email.ts.
    return Promise.reject(Object.assign(new Error(message), { status: error.response?.status }))
  },
)
