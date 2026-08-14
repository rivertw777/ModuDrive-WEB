import { useNavigate, useParams } from 'react-router-dom'
import { FileDetailPanel } from '@/features/drive'

/** Login-required deep link a RESTRICTED-scope share's "링크 복사" points at
 * (sits behind AppLayoutRoute's auth guard, unlike /public/:token). */
export default function FileRoute() {
  const { fileId } = useParams()
  const navigate = useNavigate()

  if (!fileId) return null

  return (
    <div className="flex h-full justify-end">
      <FileDetailPanel fileId={fileId} onClose={() => navigate('/drive')} />
    </div>
  )
}
