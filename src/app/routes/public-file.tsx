import { Navigate, useLocation, useParams } from 'react-router-dom'

/** Legacy alias: links minted before issue #303 unified addressing onto `/files/:fileId` used
 * this path (including any already-sent guest-invite email, whose `?key=` this preserves).
 * Redirects straight through rather than 404ing them. */
export default function PublicFileRoute() {
  const { fileId } = useParams<{ fileId: string }>()
  const location = useLocation()

  if (!fileId) return <Navigate to="/drive" replace />
  return <Navigate to={`/files/${encodeURIComponent(fileId)}${location.search}`} replace />
}
