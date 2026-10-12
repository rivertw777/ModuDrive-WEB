import axios, { type AxiosResponse } from 'axios'
import { env } from '@/config/env'

// Anonymous counterpart to view-file.ts, same relationship as download-public-file.ts has to
// download-file.ts: no bearer token, hits the permitAll /public/:fileId/view route. Returns the
// Blob, same as viewFile. `fileId` is the shared file or one nested under a
// shared folder; `key` is the capability that authorizes it.
export async function viewPublicFile(
  fileId: string,
  key: string | null,
  fileName: string,
): Promise<Blob> {
  const url = `${env.API_BASE_URL}/api/v1/storage/public/${encodeURIComponent(fileId)}/view`
  const response = (await axios.get(url, {
    params: key ? { fileName, key } : { fileName },
    responseType: 'blob',
  })) as unknown as AxiosResponse<Blob>

  return response.data
}
