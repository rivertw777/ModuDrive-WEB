import axios, { type AxiosResponse } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import type { ApiResponse } from '@/types/api'
import type { PublicFile } from '../types'

// Deliberately its own axios instance, not the shared apiClient: this route is
// anonymous (gateway permitAll), so it must not carry a stored bearer token or
// run through apiClient's 401 -> reissue -> logout interceptor, which would
// otherwise log out a visitor who happens to be signed in on an expired/bad token.
// The module augmentation in api-client.ts (get<T> -> Promise<T>) applies here too.
const publicClient = axios.create({ baseURL: env.API_BASE_URL })
publicClient.interceptors.response.use((res: AxiosResponse<ApiResponse<unknown>>) => res.data.data as AxiosResponse)

export const getPublicFile = (token: string) =>
  publicClient.get<PublicFile>(`/api/v1/files/public/${encodeURIComponent(token)}`)

export function usePublicFile(token: string) {
  return useQuery({
    queryKey: ['public-file', token],
    queryFn: () => getPublicFile(token),
  })
}

/** One level of a link-shared folder tree. `parentId` omitted lists the shared folder itself. */
export const listPublicChildren = (token: string, parentId?: string) =>
  publicClient.get<PublicFile[]>(`/api/v1/files/public/${encodeURIComponent(token)}/children`, {
    params: parentId ? { parentId } : undefined,
  })

export function usePublicChildren(token: string, parentId?: string) {
  return useQuery({
    queryKey: ['public-children', token, parentId ?? null],
    queryFn: () => listPublicChildren(token, parentId),
  })
}
