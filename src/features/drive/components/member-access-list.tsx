import { useState } from 'react'
import { cn } from '@/utils/cn'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { granteeKey, type FileShare, type Role } from '../types'
import { ROLE_LABELS } from './role-select'

export const REMOVE_ACCESS = 'REMOVE_ACCESS'
export type PendingChange = Role | typeof REMOVE_ACCESS

/** Display label for an access row with no name enrichment: a shortened UUID, or
 * 초대됨 when `id` is null (pending guest share — invited by email, not yet a member). */
function accessorLabel(id: string | null) {
  return id?.slice(0, 8) ?? '초대됨'
}

/** Controlled list — role edits and revokes are staged into `pendingChanges` by the caller and
 * only sent to the server when the share modal's 완료 is clicked. The one thing it owns locally
 * is the guest role-pick confirmation below, since that's a yes/no gate on the pick itself, not
 * an edit to stage. */
export function MemberAccessList({
  ownerId,
  ownerName,
  ownerEmail,
  shares,
  isOwner,
  pendingChanges,
  onChange,
  disabled,
}: {
  ownerId: string
  /** Only known when the caller viewing this list is the owner. */
  ownerName?: string | null
  ownerEmail?: string | null
  shares: FileShare[]
  /** Role edit / revoke are owner-only actions (also enforced server-side). */
  isOwner: boolean
  pendingChanges: Record<string, PendingChange>
  onChange: (shareId: string, change: PendingChange) => void
  disabled?: boolean
}) {
  // Picking a role on a guest's (no member account) inherited row creates a brand-new no-login
  // share link on this file (see the select's onChange below) — held here until confirmed, same
  // gate AddMemberForm gives a brand-new guest invite.
  const [guestRoleConfirm, setGuestRoleConfirm] = useState<{
    shareId: string
    role: Role
    email: string | null
  } | null>(null)

  // A direct grant on this file takes priority over a same-grantee grant inherited from an
  // ancestor folder — the row would otherwise duplicate the same person twice. The inherited
  // row still matters (it's why revoking the direct one alone is a no-op), so it's not gone
  // from the data, just not listed here — see the cascade-revoke confirm in ShareModal.
  // Keyed by granteeKey (userId, or email for a guest — see its doc comment) rather than raw
  // shareId so a guest with both a direct share and an ancestor grant is deduped the same way
  // a member is.
  const directGranteeKeys = new Set(
    shares.flatMap((s) => (s.inheritedFrom ? [] : (granteeKey(s) ?? []))),
  )
  // Two (or more) independent ancestors can separately grant the same person with no direct
  // share on this file at all — the server lists every one of those grants (never collapsed,
  // see ListFileSharesService), so without this the same person would appear once per ancestor.
  // Only the nearest one is shown — that's the role FileAccessGuard.resolveRole computes for a
  // pure-inherited grantee (no direct grant to override it with): the nearest ancestor wins
  // outright, regardless of which grant is more generous. The server lists ancestors root-most
  // first, so overwriting on every match and keeping whatever's last leaves the nearest one.
  // ShareModal's cascade-revoke still finds and clears all of them via the full `shares` array
  // regardless of which one renders here.
  const nearestPureInheritedByGrantee = new Map<string, FileShare>()
  for (const s of shares) {
    const key = granteeKey(s)
    if (!s.inheritedFrom || (key != null && directGranteeKeys.has(key))) continue
    nearestPureInheritedByGrantee.set(key ?? s.shareId, s)
  }
  // The directGranteeKeys shadow check above already excludes a shadowed row from the map, so
  // a plain identity check against it is enough here — no need to repeat that check.
  const visibleShares = shares.filter(
    (s) => !s.inheritedFrom || nearestPureInheritedByGrantee.get(granteeKey(s) ?? s.shareId) === s,
  )
  return (
    <>
      <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-brand-100 bg-brand-50/50 dark:border-brand-900/40 dark:bg-brand-950/20">
        <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800 dark:text-slate-200">
              {ownerName ?? accessorLabel(ownerId)}
            </p>
            {ownerEmail && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{ownerEmail}</p>
            )}
          </div>
          <span className="shrink-0 text-sm text-slate-400 dark:text-slate-500">소유자</span>
        </li>
        {visibleShares.map((share) => {
          const pending = pendingChanges[share.shareId]
          const removing = pending === REMOVE_ACCESS
          const selectValue = removing ? REMOVE_ACCESS : (pending ?? share.role)
          return (
            <li
              key={share.shareId}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate font-medium text-slate-800 dark:text-slate-200',
                    removing && 'text-slate-400 line-through dark:text-slate-500',
                  )}
                >
                  {share.sharedWithName ?? accessorLabel(share.sharedWithUserId)}
                </p>
                {share.sharedWithEmail && (
                  <p
                    className={cn(
                      'truncate text-xs text-slate-500 dark:text-slate-400',
                      removing && 'line-through',
                    )}
                  >
                    {share.sharedWithEmail}
                  </p>
                )}
                {share.inheritedFrom && (
                  <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                    {share.inheritedFrom.name}에서 상속됨
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {/* A pure-inherited row (no direct grant of its own here — see visibleShares above)
                    picks a role the same way a direct row does; choosing one creates this file's
                    own grant instead of updating the ancestor's (see ShareModal.onComplete) — the
                    ancestor grant and any other direct share elsewhere are untouched. A guest row
                    (invited by email, no member account — sharedWithUserId is null) picks the same
                    way, but a role pick first asks for the same no-login-access confirmation a
                    brand-new guest invite gets (see the onChange below and the dialog below the list). */}
                {!isOwner ? (
                  <span className="text-slate-500 dark:text-slate-400">
                    {ROLE_LABELS[share.role]}
                  </span>
                ) : (
                  <select
                    value={selectValue}
                    disabled={disabled}
                    onChange={(e) => {
                      const value = e.target.value as PendingChange
                      if (
                        share.inheritedFrom &&
                        !share.sharedWithUserId &&
                        value !== REMOVE_ACCESS
                      ) {
                        setGuestRoleConfirm({
                          shareId: share.shareId,
                          role: value,
                          email: share.sharedWithEmail,
                        })
                        return
                      }
                      onChange(share.shareId, value)
                    }}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                    <option value={REMOVE_ACCESS}>삭제</option>
                  </select>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {guestRoleConfirm !== null && (
        <ConfirmDialog
          open
          title="ModuDrive 이외의 계정과 공유하시겠습니까?"
          message={`${guestRoleConfirm.email ?? '이 사용자'}님에게 이 파일에 대한 개별 공유를 만들려고 합니다. 이 이메일 계정과 연결된 ModuDrive 계정이 없기 때문에, 이 초대 링크를 전달받은 사람은 누구나 로그인 없이 액세스할 수 있습니다.`}
          confirmLabel="무시하고 공유"
          cancelLabel="취소"
          onConfirm={() => {
            onChange(guestRoleConfirm.shareId, guestRoleConfirm.role)
            setGuestRoleConfirm(null)
          }}
          onCancel={() => setGuestRoleConfirm(null)}
        />
      )}
    </>
  )
}
