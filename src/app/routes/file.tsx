import { Navigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useCurrentMember } from '@/features/auth'
import { useFile } from '@/features/drive'

/** Login-required deep link a RESTRICTED-scope share's "링크 복사" points at (sits behind
 * AppLayoutRoute's auth guard, unlike /public/:fileId). Redirects into the real explorer —
 * 내 드라이브 or 공유 문서함, wherever the file actually lives — with it pre-selected, the same
 * ?file= deep link every other "위치" link uses (see file-list.tsx's openLocation). */
export default function FileRoute() {
  const { fileId } = useParams()
  const { data: file, isLoading, isError } = useFile(fileId ?? null)
  const { data: member } = useCurrentMember()

  if (!fileId) return <Navigate to="/drive" replace />
  if (isLoading || !member) return <LoadingState />
  if (isError || !file) return <ErrorState message="파일을 찾을 수 없습니다" />

  const fileParam = `?file=${encodeURIComponent(fileId)}`
  const target =
    file.ownerId === member.id
      ? `/drive${file.path === '/' ? '' : file.path}${fileParam}`
      : `/shared${fileParam}`
  return <Navigate to={target} replace />
}
