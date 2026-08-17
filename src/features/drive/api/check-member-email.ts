import { apiClient } from '@/lib/api-client'

/** member-service answers an unknown/malformed email with 400 (no separate 404 —
 * see the backend's find-by-email controller javadoc), so 400 here just means "not a member". */
export async function memberExistsByEmail(email: string): Promise<boolean> {
  try {
    await apiClient.get('/api/v1/member/find-by-email', { params: { email } })
    return true
  } catch (e) {
    if ((e as Error & { status?: number }).status === 400) return false
    throw e
  }
}
