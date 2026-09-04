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

// Google-Drive-style stable link: fileId in the path, `key` (the file's linkToken or a guest
// invite token) as the capability that authorizes it. `key` may be absent — file-service then
// 404s, which is the right result for an anonymous visitor with no capability.
const keyParams = (key: string | null) => (key ? { key } : undefined)

export const getPublicFile = (fileId: string, key: string | null) =>
  publicClient.get<PublicFile>(`/api/v1/files/public/${encodeURIComponent(fileId)}`, {
    params: keyParams(key),
  })

export function usePublicFile(fileId: string, key: string | null) {
  return useQuery({
    queryKey: ['public-file', fileId, key],
    queryFn: () => getPublicFile(fileId, key),
  })
}

/** One level of a link-shared folder tree. `fileId` is the directory to list — the link's own
 * folder or any folder nested under it; `key` stays the root link's key throughout. */
export const listPublicChildren = (fileId: string, key: string | null) =>
  publicClient.get<PublicFile[]>(`/api/v1/files/public/${encodeURIComponent(fileId)}/children`, {
    params: keyParams(key),
  })

export function usePublicChildren(fileId: string, key: string | null) {
  return useQuery({
    queryKey: ['public-children', fileId, key],
    queryFn: () => listPublicChildren(fileId, key),
  })
}
