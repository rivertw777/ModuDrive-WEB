import { TrashIcon } from '@/components/ui/icons'
import { useUpdateFileShareRole } from '../api/update-file-share-role'
import { useRevokeFileShare } from '../api/revoke-file-share'
import type { FileShare, Role } from '../types'
import { RoleSelect } from './role-select'

/** Falls back to a shortened UUID when a share row has no enrichment (should not
 * happen for the list endpoint, but keeps rendering safe either way). */
function shortId(id: string) {
  return id.slice(0, 8)
}

export function MemberAccessList({
  fileId,
  ownerId,
  shares,
}: {
  fileId: string
  ownerId: string
  shares: FileShare[]
}) {
  const updateRole = useUpdateFileShareRole()
  const revoke = useRevokeFileShare()

  return (
    <>
      <ul className="mt-2 space-y-1.5">
        <li className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
          <span className="text-slate-700 dark:text-slate-300">{shortId(ownerId)} (소유자)</span>
        </li>
        {shares.map((share) => {
          const isUpdatingThisRow = updateRole.isPending && updateRole.variables?.shareId === share.shareId
          const isRevokingThisRow = revoke.isPending && revoke.variables?.shareId === share.shareId
          return (
            <li key={share.shareId} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm">
              <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">
                {share.sharedWithEmail ?? shortId(share.sharedWithUserId)}
                {share.sharedWithName && (
                  <span className="ml-1 text-slate-400 dark:text-slate-500">({share.sharedWithName})</span>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <RoleSelect
                  value={share.role}
                  disabled={isUpdatingThisRow}
                  onChange={(role: Role) => updateRole.mutate({ fileId, shareId: share.shareId, role })}
                />
                <button
                  type="button"
                  aria-label="공유 제거"
                  disabled={isRevokingThisRow}
                  onClick={() => revoke.mutate({ fileId, shareId: share.shareId })}
                  className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-950 dark:hover:text-red-400"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {updateRole.isError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{updateRole.error.message}</p>}
      {revoke.isError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{revoke.error.message}</p>}
    </>
  )
}
