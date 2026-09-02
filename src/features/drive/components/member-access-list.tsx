import { cn } from '@/utils/cn'
import type { FileShare, Role } from '../types'
import { ROLE_LABELS } from './role-select'

export const REMOVE_ACCESS = 'REMOVE_ACCESS'
export type PendingChange = Role | typeof REMOVE_ACCESS

/** Display label for an access row with no name enrichment: a shortened UUID, or
 * 초대됨 when `id` is null (pending guest share — invited by email, not yet a member). */
function accessorLabel(id: string | null) {
  return id?.slice(0, 8) ?? '초대됨'
}

/** Pure/controlled list — role edits and revokes are staged into `pendingChanges`
 * by the caller and only sent to the server when the share modal's 완료 is clicked. */
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
  return (
    <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-brand-100 bg-brand-50/50 dark:border-brand-900/40 dark:bg-brand-950/20">
      <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 dark:text-slate-200">{ownerName ?? accessorLabel(ownerId)}</p>
          {ownerEmail && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{ownerEmail}</p>}
        </div>
        <span className="shrink-0 text-sm text-slate-400 dark:text-slate-500">소유자</span>
      </li>
      {shares.map((share) => {
        const pending = pendingChanges[share.shareId]
        const removing = pending === REMOVE_ACCESS
        const selectValue = removing ? REMOVE_ACCESS : (pending ?? share.role)
        return (
          <li key={share.shareId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
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
              {/* An inherited grant is changed from its own folder's dialog, never here. */}
              {share.inheritedFrom || !isOwner ? (
                <span className="text-slate-500 dark:text-slate-400">{ROLE_LABELS[share.role]}</span>
              ) : (
                <select
                  value={selectValue}
                  disabled={disabled}
                  onChange={(e) => onChange(share.shareId, e.target.value as PendingChange)}
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
  )
}
