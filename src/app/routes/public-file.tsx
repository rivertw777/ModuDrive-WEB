import { Navigate, useParams } from 'react-router-dom'
import { PublicFileView } from '@/features/drive'

export default function PublicFileRoute() {
  const { token } = useParams<{ token: string }>()
  if (!token) return <Navigate to="/" replace />
  return <PublicFileView token={token} />
}
