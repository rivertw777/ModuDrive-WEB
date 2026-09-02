import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { GlobeIcon, LockIcon, UserPlusIcon } from '@/components/ui/icons'
import { useCurrentMember } from '@/features/auth'
import { useFileShares } from '../api/list-file-shares'
import { useUpdateFileScope } from '../api/update-file-scope'
import { useUpdateFileShareRole } from '../api/update-file-share-role'
import { useRevokeFileShare } from '../api/revoke-file-share'
import type { ShareScope } from '../types'
import { MemberAccessList, REMOVE_ACCESS, type PendingChange } from './member-access-list'
import { ROLE_LABELS } from './role-select'
import { AddMemberForm } from './add-member-form'
import { CopyLinkButton } from './link-panel'
import { RestrictParentDialog } from './restrict-parent-dialog'

const SCOPE_LABELS: Record<ShareScope, string> = {
  RESTRICTED: '권한이 부여된 사용자',
  LINK: '링크가 있는 모든 사용자',
}

const HELP_CONTENT = (
  <ul className="space-y-2">
    <li>
      <span className="font-medium text-slate-800 dark:text-slate-100">소유자</span>는 공유 및
      액세스 권한을 수정할 수 있습니다.
    </li>
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
  const { data: access, isLoading, isError } = useFileShares(fileId, open)
  const { data: member } = useCurrentMember(open)
  const queryClient = useQueryClient()
  const updateScope = useUpdateFileScope()
  const updateRole = useUpdateFileShareRole()
  const revoke = useRevokeFileShare()
  const [view, setView] = useState<'list' | 'invite'>('list')

  // Scope/role/revoke edits are staged here and only sent to the server on 완료.
  const [pendingScope, setPendingScope] = useState<ShareScope | null>(null)
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, PendingChange>>({})
  const [commitError, setCommitError] = useState<string | null>(null)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [restrictOpen, setRestrictOpen] = useState(false)

  // Land back on the list view, with no staged edits, each time the modal is (re)opened for a file.
  useEffect(() => {
    if (open) {
      setView('list')
      setPendingScope(null)
      setPendingRoleChanges({})
      setCommitError(null)
      setConfirmCloseOpen(false)
      setRestrictOpen(false)
    }
  }, [open, fileId])

  const isOwner = access !== undefined && member !== undefined && member.id === access.ownerId
  // A directory above this file that is link-shared makes the file effectively "anyone with the
  // link" even though its own scope is RESTRICTED. Restricting the file then means turning those
  // links off (there is no per-item inheritance break) — that's what RestrictParentDialog does.
  const inheritedLinks = access?.inheritedLinks ?? []
  const effectiveScope: ShareScope | undefined =
    pendingScope ??
    (access ? (access.scope === 'LINK' || inheritedLinks.length > 0 ? 'LINK' : access.scope) : undefined)
  const isCommitting = updateScope.isPending || updateRole.isPending || revoke.isPending

  const onScopeChange = (next: ShareScope) => {
    if (next === 'RESTRICTED' && inheritedLinks.length > 0) {
      setRestrictOpen(true)
      return
    }
    setPendingScope(next)
  }

  const onRestrictConfirm = async () => {
    setRestrictOpen(false)
    setCommitError(null)
    const targets = [
      ...inheritedLinks.map((link) => link.fileId),
      ...(access?.scope === 'LINK' ? [fileId] : []),
    ]
    try {
      for (const targetId of targets) {
        await updateScope.mutateAsync({ fileId: targetId, scope: 'RESTRICTED', role: undefined })
      }
      await queryClient.invalidateQueries({ queryKey: ['file-shares', fileId] })
    } catch {
      setCommitError('상위 폴더의 링크를 해제하지 못했습니다. 다시 시도해주세요.')
    }
  }

  // RESTRICTED shares have no link token — point invited members at the
  // login-gated deep link instead of the anonymous /public/:token route.
  // Deliberately reflects the server's current scope, not a staged pending one:
  // an uncommitted scope has no valid link yet.
  const shareLink = access
    ? access.scope === 'LINK'
      ? access.linkToken
        ? `${window.location.origin}/public/${encodeURIComponent(access.linkToken)}`
        : null
      : `${window.location.origin}/files/${encodeURIComponent(fileId)}`
    : null

  const ScopeIcon = effectiveScope === 'LINK' ? GlobeIcon : LockIcon
  // A link is a bearer credential anyone who obtains it can use, so it only ever grants
  // read-only access — VIEWER isn't a default here, it's the only value the server accepts.
  const hasPendingChanges = pendingScope !== null || Object.keys(pendingRoleChanges).length > 0

  const onComplete = async () => {
    const roleEntries = Object.entries(pendingRoleChanges)
    if (!hasPendingChanges) {
      onClose()
      return
    }
    setCommitError(null)
    // Keys run parallel to tasks so a partial failure can narrow the staged edits back to
    // just what failed — revoke isn't idempotent server-side (a retried revoke of an
    // already-revoked share 404s), so resending a succeeded edit on retry would deadlock 완료.
    const keys: ('scope' | string)[] = []
    const tasks: Promise<unknown>[] = []
    if (access && pendingScope !== null && pendingScope !== access.scope) {
      keys.push('scope')
      tasks.push(
        updateScope.mutateAsync({
          fileId,
          scope: pendingScope,
          role: pendingScope === 'LINK' ? 'VIEWER' : undefined,
        }),
      )
    }
    for (const [shareId, change] of roleEntries) {
      keys.push(shareId)
      tasks.push(
        change === REMOVE_ACCESS
          ? revoke.mutateAsync({ fileId, shareId })
          : updateRole.mutateAsync({ fileId, shareId, role: change }),
      )
    }
    const results = await Promise.allSettled(tasks)
    const failedKeys = new Set(keys.filter((_, i) => results[i].status === 'rejected'))
    if (failedKeys.size > 0) {
      setPendingScope(failedKeys.has('scope') ? pendingScope : null)
      setPendingRoleChanges((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([shareId]) => failedKeys.has(shareId))),
      )
      setCommitError('일부 변경 사항을 저장하지 못했습니다. 다시 시도해주세요.')
      return
    }
    setPendingScope(null)
    setPendingRoleChanges({})
    onClose()
  }

  // Backdrop click / ESC / any other non-완료 close attempt goes through here —
  // ask once before silently dropping a scope or role/remove edit on the floor.
  // 저장 saves the pending edits then closes (same as 완료); 취소 discards them and
  // closes anyway — either choice closes the modal, it never just cancels back to it.
  const requestClose = () => {
    if (!hasPendingChanges) {
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
        {isError && <ErrorState message="공유 정보를 불러오지 못했습니다" />}

        {access && view === 'invite' && (
          <AddMemberForm
            fileId={fileId}
            onCancel={() => setView('list')}
            onDone={() => setView('list')}
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
                    value={effectiveScope}
                    disabled={isCommitting}
                    onChange={(e) => onScopeChange(e.target.value as ShareScope)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {(Object.keys(SCOPE_LABELS) as ShareScope[]).map((scope) => (
                      <option key={scope} value={scope}>
                        {SCOPE_LABELS[scope]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {SCOPE_LABELS[access.scope]}
                  </p>
                )}
              </div>
              {isOwner && effectiveScope === 'LINK' && (
                <div className="mt-2 flex items-center justify-end gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">링크 권한</span>
                  {/* New link shares are always VIEWER (server only accepts VIEWER on
                      scope updates now), but a link created before that restriction can
                      still hold a stored EDITOR role — read it from access.role rather
                      than assuming VIEWER, so a stale editable link isn't mislabeled. */}
                  <span className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
                    {ROLE_LABELS[access.role ?? 'VIEWER']}
                  </span>
                </div>
              )}
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
                pendingChanges={pendingRoleChanges}
                onChange={(shareId, change) =>
                  setPendingRoleChanges((prev) => ({ ...prev, [shareId]: change }))
                }
                disabled={isCommitting}
              />
            </div>

            <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
              {commitError && (
                <p className="mb-3 text-sm text-red-600 dark:text-red-400">{commitError}</p>
              )}
              <div className="flex items-center justify-between gap-3">
                <CopyLinkButton link={shareLink} />
                <Button
                  type="button"
                  variant="primary"
                  onClick={onComplete}
                  disabled={isCommitting}
                >
                  {isCommitting ? '저장 중...' : '완료'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirmCloseOpen}
        message="변경사항을 저장하시겠습니까?"
        confirmLabel="저장"
        onConfirm={() => {
          setConfirmCloseOpen(false)
          onComplete()
        }}
        onCancel={() => {
          setConfirmCloseOpen(false)
          onClose()
        }}
      />
      <RestrictParentDialog
        open={restrictOpen}
        fileName={fileName}
        folders={inheritedLinks}
        includesThisItem={access?.scope === 'LINK'}
        onConfirm={onRestrictConfirm}
        onCancel={() => setRestrictOpen(false)}
      />
    </>
  )
}
