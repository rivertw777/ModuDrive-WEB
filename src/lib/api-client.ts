import axios, { type AxiosResponse } from 'axios'
import { env } from '@/config/env'
import type { ApiResponse } from '@/types/api'

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
}

/** Marks a request the user didn't trigger (polling), so it can't keep an idle session alive —
 * the gateway checks the session without restarting its 30-minute idle timeout (API spec 004). */
export const BACKGROUND_REQUEST_HEADERS = { 'X-Background-Request': 'true' } as const

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  // The only credential is the HttpOnly session cookie, and the API is a different origin —
  // without this the browser wouldn't send it.
  withCredentials: true,
})

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    return response.data.data as AxiosResponse
  },
  async (error) => {
    // No refresh step to retry: a 401 means the session is gone (logged out, idle 30 min, or
    // past 12 h), so the only way forward is the login screen.
    if (error.response?.status === 401) {
      const { useAuthStore } = await import('@/stores/auth-store')
      useAuthStore.getState().setAnonymous()
    }

    const message = error.response?.data?.message ?? error.message
    // status carried through so callers can branch on "not found" vs. other failures without
    // re-parsing the (locale-specific) message text — see check-member-email.ts. `data` is the
    // backend's optional ApiResponse.error(..., data) payload (e.g. FileAccessGuard attaching
    // isDirectory to a FILE_ACCESS_DENIED) — see file.tsx's access-denied alert.
    return Promise.reject(
      Object.assign(new Error(message), {
        status: error.response?.status,
        data: error.response?.data?.data,
      }),
    )
  },
)
