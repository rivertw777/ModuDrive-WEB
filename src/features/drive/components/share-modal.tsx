import { Dialog } from '@/components/ui/dialog'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useFileShares } from '../api/list-file-shares'
import { useUpdateFileScope } from '../api/update-file-scope'
import type { ShareScope } from '../types'
import { MemberAccessList } from './member-access-list'
import { AddMemberForm } from './add-member-form'
import { LinkPanel } from './link-panel'

const SCOPE_LABELS: Record<ShareScope, string> = {
  RESTRICTED: '권한이 있는 사용자만',
  LINK: '링크가 있는 모든 사용자 (뷰어)',
}

export function ShareModal({
  open,
  onClose,
  fileId,
}: {
  open: boolean
  onClose: () => void
  fileId: string
}) {
  const { data: access, isLoading, isError } = useFileShares(fileId, open)
  const updateScope = useUpdateFileScope()

  return (
    <Dialog open={open} onClose={onClose} title="파일 공유">
      {isLoading && <LoadingState />}
      {isError && <ErrorState message="공유 정보를 불러오지 못했습니다" />}

      {access && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">공유 범위</label>
            <select
              value={access.scope}
              disabled={updateScope.isPending}
              onChange={(e) => updateScope.mutate({ fileId, scope: e.target.value as ShareScope })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {(Object.keys(SCOPE_LABELS) as ShareScope[]).map((scope) => (
                <option key={scope} value={scope}>
                  {SCOPE_LABELS[scope]}
                </option>
              ))}
            </select>
            {updateScope.isError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{updateScope.error.message}</p>
            )}
            {access.scope === 'LINK' &&
              (access.linkToken ? (
                <LinkPanel linkToken={access.linkToken} />
              ) : (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">링크를 발급하지 못했습니다</p>
              ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">액세스 권한</label>
            <MemberAccessList fileId={fileId} ownerId={access.ownerId} shares={access.shares} />
            <AddMemberForm fileId={fileId} />
          </div>
        </div>
      )}
    </Dialog>
  )
}
