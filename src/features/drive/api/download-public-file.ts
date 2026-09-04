import axios, { type AxiosResponse } from 'axios'
import { env } from '@/config/env'

// Anonymous counterpart to download-file.ts: same raw-bytes response (so it must
// bypass apiClient's ApiResponse-unwrapping interceptor), but the route is
// permitAll — deliberately sends no bearer token, so a visitor signed in on an
// expired token can't get logged out by downloading a public link.
// api-client.ts's AxiosInstance type augmentation applies module-wide, so cast
// back to the real runtime shape (AxiosResponse) since no interceptor runs here.
//
// `fileId` is the shared file or one nested under a shared folder; `key` is the
// capability (the file's linkToken or a guest invite token).
export async function downloadPublicFile(fileId: string, key: string | null, fileName: string) {
  const url = `${env.API_BASE_URL}/api/v1/storage/public/${encodeURIComponent(fileId)}/download`
  const response = (await axios.get(url, {
    params: key ? { key } : undefined,
    responseType: 'blob',
  })) as unknown as AxiosResponse<Blob>

  const objectUrl = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(objectUrl)
}
