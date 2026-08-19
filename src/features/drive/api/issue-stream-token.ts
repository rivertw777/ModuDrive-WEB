import { apiClient } from '@/lib/api-client'

// Mints a short-lived, single-file token so an <audio>/<video> element's direct `src` request
// (which can't carry an Authorization header) can still authenticate against /storage/view.
// Public links skip this entirely — the link token in the URL already is the credential.
export async function issueStreamToken(fileId: string): Promise<string> {
  const { streamToken } = await apiClient.post<{ streamToken: string }>(
    '/api/v1/storage/stream-token',
    undefined,
    { params: { fileId } },
  )
  return streamToken
}
