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
import { useShareFile } from '../api/share-file'
import { granteeKey, type Role, type ShareScope } from '../types'
import { MemberAccessList, REMOVE_ACCESS, type PendingChange } from './member-access-list'
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
  const { data: access, isLoading, isError } = useFileShares(fileId, open)
  const { data: member } = useCurrentMember(open)
  const queryClient = useQueryClient()
  const updateScope = useUpdateFileScope()
  const updateRole = useUpdateFileShareRole()
  const revoke = useRevokeFileShare()
  const createShare = useShareFile()
  const [view, setView] = useState<'list' | 'invite'>('list')

  // Scope/role/revoke edits are staged here and only sent to the server on 완료.
  const [pendingScope, setPendingScope] = useState<ShareScope | null>(null)
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, PendingChange>>({})
  // Removing a direct share whose grantee also has a separate grant on one or more ancestor
  // folders is a no-op unless every one of those ancestor grants goes too (see
  // RevokeInheritedDialog — ListFileSharesService never collapses independent ancestor grants
  // for the same person down to one). Staged here keyed by the triggering row's shareId, one
  // cascade entry per ancestor that also grants this person access.
  const [cascadeRevokes, setCascadeRevokes] = useState<
    Record<string, { fileId: string; shareId: string }[]>
  >({})
  const [cascadeTarget, setCascadeTarget] = useState<{
    directShareId: string
    granteeLabel: string
    fileRole: Role
    ancestors: { fileId: string; shareId: string; name: string; role: Role }[]
  } | null>(null)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [restrictOpen, setRestrictOpen] = useState(false)

  // Land back on the list view, with no staged edits, each time the modal is (re)opened for a file.
  useEffect(() => {
    if (open) {
      setView('list')
      setPendingScope(null)
      setPendingRoleChanges({})
      setCascadeRevokes({})
      setCascadeTarget(null)
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
    (access
      ? access.scope === 'LINK' || inheritedLinks.length > 0
        ? 'LINK'
        : access.scope
      : undefined)
  const isCommitting =
    updateScope.isPending || updateRole.isPending || revoke.isPending || createShare.isPending

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

  // A member's row here can be shadowed by a separate grant on an ancestor folder (this file
  // itself was shared directly, then a folder above it also was) — dropping just this row would
  // change nothing, since the ancestor grant still lets them in. Removing that ancestor row would
  // also drop every other file only reachable through it, so this is confirmed, not silent.
  // Two (or more) *independent* ancestors can each separately grant the same person — the server
  // never collapses those to one (see ListFileSharesService), so every one of them has to be
  // found and cascaded, not just the nearest.
  const onMemberChange = (shareId: string, change: PendingChange) => {
    const target = access?.shares.find((s) => s.shareId === shareId)
    // userId for a member, invited email for a guest (see granteeKey's doc comment) — a guest's
    // userId is always null, so matching on that alone would never find their other ancestor
    // grants.
    const grantee = target ? granteeKey(target) : null
    // Every ancestor that also grants this same person access, root-most first (matches
    // access.shares' own order — see ListFileSharesService, never collapsed to one). If `target`
    // itself is a pure-inherited row it's naturally included here too, in its correct position —
    // its own shareId already IS that ancestor's real share id.
    const ancestorGrants = (access?.shares ?? []).filter(
      (s) => grantee !== null && granteeKey(s) === grantee && s.inheritedFrom,
    )

    if (change !== REMOVE_ACCESS) {
      setCascadeRevokes((prev) => {
        if (!(shareId in prev)) return prev
        return Object.fromEntries(Object.entries(prev).filter(([id]) => id !== shareId))
      })
      setPendingRoleChanges((prev) => ({ ...prev, [shareId]: change }))
      return
    }
    if (target && ancestorGrants.length > 0) {
      setCascadeTarget({
        directShareId: shareId,
        granteeLabel: target.sharedWithEmail ?? target.sharedWithName ?? '이 사용자',
        fileRole: target.role,
        // flatMap, not map: every entry here was already filtered for inheritedFrom above, but
        // narrowing that through the array construction is more code than just re-checking here.
        ancestors: ancestorGrants.flatMap((s) => {
          const from = s.inheritedFrom
          return from ? [{ fileId: from.fileId, shareId: s.shareId, name: from.name, role: s.role }] : []
        }),
      })
      return
    }
    setPendingRoleChanges((prev) => ({ ...prev, [shareId]: change }))
  }

  const onCascadeConfirm = () => {
    if (!cascadeTarget) return
    // Always staged, even when the clicked row is itself a pure-inherited one (no direct share
    // of its own on this file): MemberAccessList reads pendingRoleChanges by the row's own
    // shareId to show it as "삭제", regardless of what kind of row it is. onComplete separately
    // skips sending a *second*, wrongly-scoped revoke when this shareId also appears in
    // cascadeRevokes below (see its dedup check) — that's unrelated to this UI feedback.
    setPendingRoleChanges((prev) => ({ ...prev, [cascadeTarget.directShareId]: REMOVE_ACCESS }))
    setCascadeRevokes((prev) => ({
      ...prev,
      [cascadeTarget.directShareId]: cascadeTarget.ancestors.map((a) => ({
        fileId: a.fileId,
        shareId: a.shareId,
      })),
    }))
    setCascadeTarget(null)
  }

  // One address regardless of access scope or who follows it (issue #303): /files/:fileId routes
  // an anonymous visitor to the read-only view when this file (or an ancestor) is LINK-scoped,
  // and a signed-in one straight into the real app when they have actual access — see file.tsx.
  // No token in the URL, so it never changes when link sharing is toggled off/on.
  const shareLink = access ? `${window.location.origin}/files/${encodeURIComponent(fileId)}` : null

  const ScopeIcon = effectiveScope === 'LINK' ? GlobeIcon : LockIcon
  // A link is a bearer credential anyone who obtains it can use, so it only ever grants
  // read-only access — VIEWER isn't a default here, it's the only value the server accepts.
  const hasPendingChanges =
    pendingScope !== null ||
    Object.keys(pendingRoleChanges).length > 0 ||
    Object.keys(cascadeRevokes).length > 0

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
      // A pure-inherited row's own shareId IS one ancestor's real share id (see
      // MemberAccessList's delete-only affordance for such a row) — cascadeRevokes below already
      // targets it with the correct fileId, so sending this one too would hit it under *this*
      // file's id instead and 404.
      if (change === REMOVE_ACCESS && cascadeRevokes[shareId]?.some((c) => c.shareId === shareId))
        continue
      keys.push(shareId)
      const row = access?.shares.find((s) => s.shareId === shareId)
      tasks.push(
        change === REMOVE_ACCESS
          ? revoke.mutateAsync({ fileId, shareId })
          : row?.inheritedFrom
            ? // Picking a role on a pure-inherited row has no share of its own on this file to
              // PATCH (that shareId belongs to the ancestor) — it creates one instead, the same
              // override 사용자 추가 would (see 폴더 공유 상속 spec 3.3).
              createShare.mutateAsync({ fileId, email: row.sharedWithEmail ?? '', role: change })
            : updateRole.mutateAsync({ fileId, shareId, role: change }),
      )
    }
    // Every ancestor cascade is tracked and retried independently of its triggering direct row
    // (and of each other) — resending a revoke that already succeeded 404s (see the note above),
    // so a retry must not resend one just because a sibling cascade or the direct row failed.
    for (const [directShareId, cascades] of Object.entries(cascadeRevokes)) {
      for (const cascade of cascades) {
        keys.push(`cascade:${directShareId}:${cascade.shareId}`)
        tasks.push(revoke.mutateAsync({ fileId: cascade.fileId, shareId: cascade.shareId }))
      }
    }
    const results = await Promise.allSettled(tasks)
    const failedKeys = new Set(keys.filter((_, i) => results[i].status === 'rejected'))
    if (failedKeys.size > 0) {
      setPendingScope(failedKeys.has('scope') ? pendingScope : null)
      setPendingRoleChanges((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([shareId]) => {
            if (keys.includes(shareId)) return failedKeys.has(shareId)
            // Never entered `keys` above — a same-shareId cascade (pure-inherited row) handled
            // it instead. Its only retry signal is that specific cascade failing; a sibling
            // ancestor's cascade failing must not resend this one, or it 404s on retry.
            const selfCascade = cascadeRevokes[shareId]?.find((c) => c.shareId === shareId)
            return selfCascade ? failedKeys.has(`cascade:${shareId}:${selfCascade.shareId}`) : false
          }),
        ),
      )
      setCascadeRevokes((prev) => {
        const next: typeof prev = {}
        for (const [directShareId, cascades] of Object.entries(prev)) {
          const remaining = cascades.filter((c) =>
            failedKeys.has(`cascade:${directShareId}:${c.shareId}`),
          )
          if (remaining.length > 0) next[directShareId] = remaining
        }
        return next
      })
      setCommitError('일부 변경 사항을 저장하지 못했습니다. 다시 시도해주세요.')
      return
    }
    setPendingScope(null)
    setPendingRoleChanges({})
    setCascadeRevokes({})
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
                {isOwner && effectiveScope === 'LINK' && (
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
                pendingChanges={pendingRoleChanges}
                onChange={onMemberChange}
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
        folders={inheritedLinks}
        fileName={fileName}
        onConfirm={onRestrictConfirm}
        onCancel={() => setRestrictOpen(false)}
      />
      <RevokeInheritedDialog
        open={cascadeTarget !== null}
        granteeLabel={cascadeTarget?.granteeLabel ?? ''}
        ancestors={cascadeTarget?.ancestors ?? []}
        fileName={fileName}
        fileRole={cascadeTarget?.fileRole ?? 'VIEWER'}
        onConfirm={onCascadeConfirm}
        onCancel={() => setCascadeTarget(null)}
      />
    </>
  )
}
