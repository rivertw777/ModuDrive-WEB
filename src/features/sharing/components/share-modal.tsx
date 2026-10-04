import { useEffect, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { GlobeIcon, LockIcon, UserPlusIcon } from '@/components/ui/icons'
import { useCurrentMember } from '@/features/auth'
import { useFileShares } from '../api/list-file-shares'
import { usePendingShareChanges } from '../hooks/use-pending-share-changes'
import type { ShareScope } from '../types'
import { MemberAccessList } from './member-access-list'
import { ROLE_LABELS } from './role-select'
import { AddMemberForm } from './add-member-form'
import { CopyLinkButton } from './link-panel'
import { RestrictParentDialog } from './restrict-parent-dialog'
import { RevokeInheritedDialog } from './revoke-inherited-dialog'

const SCOPE_LABELS: Record<ShareScope, string> = {
  RESTRICTED: '권한이 부여된 사용자',
  LINK: '링크가 있는 모든 사용자',
}

const HELP_CONTENT = (
  <ul className="space-y-2">
    <li>
      <span className="font-medium text-slate-800 dark:text-slate-100">뷰어</span>는 공유받은 파일의
      조회 및 다운로드가 가능합니다.
    </li>
    <li>
      <span className="font-medium text-slate-800 dark:text-slate-100">편집자</span>는 공유받은
      파일의 조회, 다운로드 및 이름 수정이 가능합니다.
    </li>
  </ul>
)

export function ShareModal({
  open,
  onClose,
  fileId,
  fileName,
}: {
  open: boolean
  onClose: () => void
  fileId: string
  fileName: string
}) {
  const { data: access, isLoading, isError, error: loadError } = useFileShares(fileId, open)
  const { data: member } = useCurrentMember(open)
  const pending = usePendingShareChanges({ fileId, open, access })
  const [view, setView] = useState<'list' | 'invite'>('list')

  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  // Bumped to hand a close attempt to the invite form, which knows whether it holds a draft.
  const [inviteCloseRequest, setInviteCloseRequest] = useState(0)

  // Land back on the list view each time the modal is (re)opened for a file (the hook drops the
  // staged edits on the same signal).
  useEffect(() => {
    if (open) {
      setView('list')
      setConfirmCloseOpen(false)
    }
  }, [open, fileId])

  const isOwner = access !== undefined && member !== undefined && member.id === access.ownerId
  // One address regardless of access scope or who follows it (issue #303): /files/:fileId routes
  // an anonymous visitor to the read-only view when this file (or an ancestor) is LINK-scoped,
  // and a signed-in one straight into the real app when they have actual access — see file.tsx.
  // No token in the URL, so it never changes when link sharing is toggled off/on.
  const shareLink = access ? `${window.location.origin}/files/${encodeURIComponent(fileId)}` : null

  const ScopeIcon = pending.effectiveScope === 'LINK' ? GlobeIcon : LockIcon
  const onComplete = async () => {
    if (await pending.commit()) onClose()
  }

  // Backdrop click / ESC / any other non-완료 close attempt goes through here —
  // ask once before silently dropping a scope or role/remove edit on the floor.
  // 삭제 discards them and closes; 취소 goes back to the modal with the edits intact.
  const requestClose = () => {
    if (view === 'invite') {
      setInviteCloseRequest((n) => n + 1)
      return
    }
    closeList()
  }

  const closeList = () => {
    if (!pending.hasPendingChanges) {
      onClose()
      return
    }
    setConfirmCloseOpen(true)
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        title={`"${fileName}" 공유`}
        size="lg"
        onBack={view === 'invite' ? () => setView('list') : undefined}
        closeButton="help"
        helpContent={HELP_CONTENT}
      >
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="공유 정보를 불러오지 못했습니다" error={loadError} compact />}

        {access && view === 'invite' && (
          <AddMemberForm
            fileId={fileId}
            onCancel={() => setView('list')}
            onDone={() => setView('list')}
            closeRequest={inviteCloseRequest}
            onClose={() => {
              setView('list')
              closeList()
            }}
          />
        )}

        {access && view === 'list' && (
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                액세스 범위
              </label>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                  <ScopeIcon size={18} />
                </span>
                {isOwner ? (
                  <select
                    value={pending.effectiveScope}
                    disabled={pending.isCommitting}
                    onChange={(e) => pending.onScopeChange(e.target.value as ShareScope)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {(Object.keys(SCOPE_LABELS) as ShareScope[]).map((scope) => (
                      <option key={scope} value={scope}>
                        {SCOPE_LABELS[scope]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">
                    {SCOPE_LABELS[access.scope]}
                  </p>
                )}
                {/* New link shares are always VIEWER (server only accepts VIEWER on scope
                    updates now), but a link created before that restriction can still hold a
                    stored EDITOR role — read it from access.role rather than assuming VIEWER,
                    so a stale editable link isn't mislabeled. */}
                {isOwner && pending.effectiveScope === 'LINK' && (
                  <span
                    data-testid="link-role-badge"
                    className="flex shrink-0 items-center self-stretch rounded-lg border border-slate-300 px-3 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300"
                  >
                    {ROLE_LABELS[access.role ?? 'VIEWER']}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  액세스 권한이 있는 사용자
                </label>
                {isOwner && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1"
                    onClick={() => setView('invite')}
                  >
                    <UserPlusIcon size={15} />
                    사용자 추가
                  </Button>
                )}
              </div>
              <MemberAccessList
                ownerId={access.ownerId}
                ownerName={isOwner ? (member?.name ?? null) : null}
                ownerEmail={isOwner ? (member?.email ?? null) : null}
                shares={access.shares}
                isOwner={isOwner}
                directory={access.directory}
                pendingChanges={pending.pendingRoleChanges}
                onChange={pending.onMemberChange}
                disabled={pending.isCommitting}
              />
            </div>

            <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
              {pending.commitError && (
                <p className="mb-3 text-sm text-red-600 dark:text-red-400">{pending.commitError}</p>
              )}
              <div className="flex items-center justify-between gap-3">
                <CopyLinkButton link={shareLink} />
                <Button
                  type="button"
                  variant="primary"
                  onClick={onComplete}
                  disabled={pending.isCommitting}
                >
                  {pending.isCommitting ? '저장 중...' : '완료'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirmCloseOpen}
        message="저장되지 않은 변경사항을 삭제하시겠습니까?"
        confirmLabel="삭제"
        danger
        onConfirm={() => {
          setConfirmCloseOpen(false)
          onClose()
        }}
        onCancel={() => setConfirmCloseOpen(false)}
      />
      <RestrictParentDialog
        open={pending.restrictOpen}
        folders={pending.inheritedLinks}
        fileName={fileName}
        onConfirm={pending.onRestrictConfirm}
        onCancel={pending.cancelRestrict}
      />
      <RevokeInheritedDialog
        open={pending.cascadeTarget !== null}
        granteeLabel={pending.cascadeTarget?.granteeLabel ?? ''}
        ancestors={pending.cascadeTarget?.ancestors ?? []}
        fileName={fileName}
        fileRole={pending.cascadeTarget?.fileRole ?? 'VIEWER'}
        onConfirm={pending.onCascadeConfirm}
        onCancel={pending.cancelCascade}
      />
    </>
  )
}
