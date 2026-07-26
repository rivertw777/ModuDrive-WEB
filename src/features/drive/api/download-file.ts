import axios, { type AxiosResponse } from 'axios'
import { env } from '@/config/env'
import { ACCESS_TOKEN_STORAGE_KEY } from '@/lib/api-client'

// Bypasses the shared apiClient: the download endpoint returns raw bytes,
// not the ApiResponse envelope that apiClient's interceptor always unwraps.
// api-client.ts's AxiosInstance type augmentation applies module-wide, so the
// plain `axios` import below is mistyped as returning unwrapped data; cast
// back to the real runtime shape (AxiosResponse) since no interceptor runs here.
export async function downloadFile(fileId: string, fileName: string) {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  const response = (await axios.get(`${env.API_BASE_URL}/api/v1/storage/download/${fileId}`, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })) as unknown as AxiosResponse<Blob>

  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
