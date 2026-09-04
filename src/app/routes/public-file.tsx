import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { LoadingState } from '@/components/ui/state'
import { useAuthStore } from '@/stores/auth-store'
import { PublicFileView, useFile } from '@/features/drive'

/**
 * Google-Drive-style share link `/public/:fileId?key=`.
 *
 * A signed-in visitor who actually has access opens it in the real app (`/files/:fileId`) —
 * folders included, `FileRoute` drops them into 내 드라이브/공유 문서함 pre-selected, same as any
 * other `?file=` deep link — with their full context, not the stripped anonymous page. Until we
 * know, or if they turn out not to have access (a guest whose claim hasn't landed yet, or someone
 * signed in as a different account), fall back to the anonymous `key` view.
 */
export default function PublicFileRoute() {
  const { fileId } = useParams<{ fileId: string }>()
  const [searchParams] = useSearchParams()
  const shareKey = searchParams.get('key')
  const isAuthenticated = useAuthStore((s) => s.accessToken != null)

  if (!fileId) return <Navigate to="/" replace />
  if (!isAuthenticated) return <PublicFileView fileId={fileId} shareKey={shareKey} />
  return <AuthenticatedPublicRedirect fileId={fileId} shareKey={shareKey} />
}

function AuthenticatedPublicRedirect({
  fileId,
  shareKey,
}: {
  fileId: string
  shareKey: string | null
}) {
  const { isLoading, isError } = useFile(fileId)
  if (isLoading) return <LoadingState />
  if (isError) return <PublicFileView fileId={fileId} shareKey={shareKey} />
  return <Navigate to={`/files/${encodeURIComponent(fileId)}`} replace />
}
