import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LoadingState } from '@/components/ui/state'
import { useAuthStore } from '@/stores/auth-store'
import { useAlertStore } from '@/stores/alert-store'
import { useCurrentMember } from '@/features/auth'
import { PublicFileView, useFile, usePublicFile } from '@/features/drive'

/**
 * The one share-link address for a file, regardless of access scope or visitor type (issue #303):
 * `/files/:fileId[?key=]`. `key` only ever matters for an unregistered guest invite now — a
 * LINK-scoped entry (this file's own scope, or an ancestor's) needs none, see file-service
 * `FileAccessGuard.linkRole` / `PublicFileResolver`. Deliberately not nested under
 * `AppLayoutRoute` (unlike every other authenticated route) — that guard redirects to /login on
 * `accessToken == null` alone, before any API call, which would wrongly gate an anonymous LINK
 * visitor behind a login screen.
 *
 * What renders depends on who's asking, resolved in this order:
 * - Signed in with real access (owner, direct/inherited share, or a LINK-scoped self/ancestor) ->
 *   the real app, this file pre-selected (내 드라이브/공유 문서함) — the same `?file=` deep link
 *   every other "위치" link uses.
 * - Signed in without access -> access-denied. Never a login redirect: they're already signed in,
 *   so logging in again fixes nothing.
 * - Not signed in, and the file is reachable anonymously (LINK scope, or `key` matches a guest
 *   invite token) -> the anonymous read-only view, no login required.
 * - Not signed in and neither of the above -> /login. file-service returns the same 404 for
 *   "doesn't exist" and "exists, log in to see it" alike (deliberately — see
 *   `PublicFileResolver`), so this is also where a bogus link ends up: indistinguishable from the
 *   outside, same as a real share a stranger can't tell exists.
 */
export default function FileRoute() {
  const { fileId } = useParams<{ fileId: string }>()
  const [searchParams] = useSearchParams()
  const shareKey = searchParams.get('key')
  const isAuthenticated = useAuthStore((s) => s.accessToken != null)

  if (!fileId) return <Navigate to="/drive" replace />
  if (isAuthenticated) return <AuthenticatedFileRoute fileId={fileId} shareKey={shareKey} />
  return <AnonymousFileRoute fileId={fileId} shareKey={shareKey} />
}

/** file-service attaches isDirectory to a FILE_ACCESS_DENIED body (see FileAccessGuard) — it
 * already found the file before denying, so this isn't a new existence leak. Read via
 * api-client's generic `data` passthrough on a rejected request; absent (e.g. a genuine
 * FILE_NOT_FOUND, or the anonymous PublicFileResolver's deliberately uninformative rejection —
 * see FileRoute's own doc comment) means the type just isn't known here. */
function deniedIsDirectory(error: unknown): boolean | undefined {
  const data = (error as { data?: unknown } | null)?.data
  return typeof data === 'object' && data !== null && 'isDirectory' in data
    ? (data as { isDirectory?: unknown }).isDirectory === true
    : undefined
}

function AuthenticatedFileRoute({ fileId, shareKey }: { fileId: string; shareKey: string | null }) {
  const { data: file, error, isLoading, isError } = useFile(fileId)
  const { data: member } = useCurrentMember()

  if (isLoading) return <LoadingState />
  if (isError || !file)
    return (
      <AnonymousFileRoute
        fileId={fileId}
        shareKey={shareKey}
        deniedIfNoAccess
        deniedIsDirectory={deniedIsDirectory(error)}
      />
    )
  if (!member) return <LoadingState />

  const fileParam = `?file=${encodeURIComponent(fileId)}`
  const target =
    file.ownerId === member.id
      ? `/drive${file.path === '/' ? '' : file.path}${fileParam}`
      : `/shared${fileParam}`
  return <Navigate to={target} replace />
}

function AnonymousFileRoute({
  fileId,
  shareKey,
  deniedIfNoAccess = false,
  deniedIsDirectory,
}: {
  fileId: string
  shareKey: string | null
  /** True once we already know the visitor is signed in but has no real grant (the authenticated
   * lookup above 404'd) — an access-denied message is right then, not a redirect to /login. False
   * (a genuinely anonymous visitor) sends a failed lookup to /login instead, preserving this
   * address so they land right back here once signed in. */
  deniedIfNoAccess?: boolean
  /** Only meaningful alongside deniedIfNoAccess — from the authenticated lookup's own error, not
   * this component's usePublicFile below (that one's deliberately opaque, see FileRoute's doc
   * comment). Undefined when the type genuinely isn't known (e.g. the file doesn't exist at all). */
  deniedIsDirectory?: boolean
}) {
  const { isLoading, isError } = usePublicFile(fileId, shareKey)
  const location = useLocation()
  const navigate = useNavigate()
  const showAlert = useAlertStore((s) => s.show)

  // Access-denied is a redirect + alert, not an inline page — there is nothing useful for the
  // visitor to do on this address once they're known to have no access, so send them back to
  // their own drive instead of leaving them stranded on a dead end. Navigate first, then queue
  // the alert (see useAlertStore/GlobalAlert) so it renders on top of the drive page they land
  // on, not this one they're already leaving.
  useEffect(() => {
    if (isError && deniedIfNoAccess) {
      navigate('/drive', { replace: true })
      const noun = deniedIsDirectory === undefined ? '항목' : deniedIsDirectory ? '폴더' : '파일'
      showAlert(`이 ${noun}에 접근할 권한이 없습니다`)
    }
  }, [isError, deniedIfNoAccess, deniedIsDirectory, navigate, showAlert])

  if (isLoading) return <LoadingState />
  if (isError) {
    if (deniedIfNoAccess) return null
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <PublicFileView fileId={fileId} shareKey={shareKey} />
}
