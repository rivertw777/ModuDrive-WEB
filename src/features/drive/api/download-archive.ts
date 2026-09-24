import axios, { type AxiosResponse } from 'axios'
import { env } from '@/config/env'
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

// Several files and/or folders download as one zip, in two steps: a checked "prepare" call
// (errors like too-large or quota come back here as a normal rejection), then a plain link to
// the single-use token it returns. Link navigation, not a Blob fetch, so the browser shows its
// own download progress and never holds a multi-GB zip in memory — the response is
// `Content-Disposition: attachment`, so the page itself stays put.
function followArchiveLink(token: string) {
  const link = document.createElement('a')
  link.href = `${env.API_BASE_URL}/api/v1/storage/public/archive/${encodeURIComponent(token)}`
  link.click()
}

export async function downloadArchive(fileIds: string[]) {
  const { token } = await apiClient.post<{ token: string }>('/api/v1/storage/archive', { fileIds })
  followArchiveLink(token)
}

// Anonymous counterpart for public links: plain axios with no bearer token, same reason as
// download-public-file.ts (an expired token must not log a visitor out). Errors are rethrown
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
    const message = axios.isAxiosError<ApiResponse<unknown>>(error)
      ? (error.response?.data?.message ?? error.message)
      : String(error)
    throw new Error(message)
  }
}

export function alertDownloadFailure(error: unknown) {
  window.alert(error instanceof Error ? error.message : '다운로드하지 못했습니다.')
}
