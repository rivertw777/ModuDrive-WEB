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

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    return response.data.data as AxiosResponse
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    }
    const message = error.response?.data?.message ?? error.message
    return Promise.reject(new Error(message))
  },
)
