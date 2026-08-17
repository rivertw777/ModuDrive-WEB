import axios, { type AxiosResponse } from 'axios'
import { env } from '@/config/env'

// Anonymous counterpart to view-file.ts, same relationship as download-public-file.ts has to
// download-file.ts: no bearer token, hits the permitAll /public/:token/view route. Caller owns
// the returned object URL and must revoke it.
export async function viewPublicFile(token: string, fileName: string): Promise<string> {
  const response = (await axios.get(
    `${env.API_BASE_URL}/api/v1/storage/public/${encodeURIComponent(token)}/view`,
    { params: { fileName }, responseType: 'blob' },
  )) as unknown as AxiosResponse<Blob>

  return URL.createObjectURL(response.data)
}
