import axios, { type AxiosResponse } from 'axios'
import { env } from '@/config/env'
import { ACCESS_TOKEN_STORAGE_KEY } from '@/lib/api-client'

// Inline counterpart to download-file.ts: same raw-bytes request, but hits /view so the backend
// sends a real Content-Type + `inline` disposition instead of octet-stream/attachment — required
// for the returned blob to actually render in an <img>/<audio>/<video> tag instead of the browser
// refusing it or offering a save dialog. Caller owns the returned object URL and must revoke it.
export async function viewFile(fileId: string, fileName: string): Promise<string> {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  const response = (await axios.get(
    `${env.API_BASE_URL}/api/v1/storage/view/${encodeURIComponent(fileId)}`,
    {
      params: { fileName },
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )) as unknown as AxiosResponse<Blob>

  return URL.createObjectURL(response.data)
}
