import axios, { type AxiosResponse } from 'axios'
import { env } from '@/config/env'
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

// Every download, in two steps: a checked "prepare" call (errors like too-large or quota come back
// here as a normal rejection), then a plain link to the single-use token it returns. One picked
// file comes down as itself, under its real name; a folder or several items as one zip. Link
// navigation, not a Blob fetch, so the browser shows its own download progress and never holds a
// multi-GB file in memory — the response is `Content-Disposition: attachment`, so the page itself
// stays put.
function followArchiveLink(token: string) {
  const link = document.createElement('a')
  link.href = `${env.API_BASE_URL}/api/v1/storage/public/archive/${encodeURIComponent(token)}`
  link.click()
}

export async function downloadArchive(fileIds: string[]) {
  const { token } = await apiClient.post<{ token: string }>('/api/v1/storage/archive', { fileIds })
  followArchiveLink(token)
}

// Anonymous counterpart for public links: plain axios with no bearer token, so a visitor signed in
// on an expired token can't get logged out by downloading a public link. `fileIds` are shared
// entries or ones nested under a shared folder; `key` only matters for a guest invite. Errors are rethrown
// with the server's message, matching what apiClient gives the signed-in path.
export async function downloadPublicArchive(fileIds: string[], key: string | null) {
  try {
    const response = (await axios.post(
      `${env.API_BASE_URL}/api/v1/storage/public/archive`,
      { fileIds },
      { params: key ? { key } : undefined },
    )) as unknown as AxiosResponse<ApiResponse<{ token: string }>>
    followArchiveLink(response.data.data.token)
  } catch (error) {
    if (!axios.isAxiosError<ApiResponse<unknown>>(error)) throw new Error(String(error))
    throw Object.assign(new Error(error.response?.data?.message ?? error.message), {
      status: error.response?.status,
    })
  }
}
