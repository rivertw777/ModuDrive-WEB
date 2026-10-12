import axios, { type AxiosResponse } from 'axios'
import { env } from '@/config/env'

// Inline counterpart to download-file.ts: same raw-bytes request, but hits /view so the backend
// sends a real Content-Type + `inline` disposition instead of octet-stream/attachment — required
// for the returned blob to actually render in an <img>/<audio>/<video> tag instead of the browser
// refusing it or offering a save dialog. Returns the Blob itself: text is read off it directly,
// since fetch()ing an object URL back is a connect-src request the CSP blocks (no blob: there).
export async function viewFile(fileId: string, fileName: string): Promise<Blob> {
  const response = (await axios.get(
    `${env.API_BASE_URL}/api/v1/storage/view/${encodeURIComponent(fileId)}`,
    {
      params: { fileName },
      responseType: 'blob',
      // Plain axios, not apiClient, so the session cookie has to be opted in here too.
      withCredentials: true,
    },
  )) as unknown as AxiosResponse<Blob>

  return response.data
}
