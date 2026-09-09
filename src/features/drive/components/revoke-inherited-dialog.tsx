import { useEffect, useRef } from 'react'
import type { Role } from '../types'
import { AccessChangeTree } from './access-change-tree'
import { ROLE_LABELS } from './role-select'

/**
 * Shown when removing someone's direct access to a file would be a no-op: they also have a
 * separate grant on one or more directories above it, which keep letting them in regardless.
 * Mirrors Google Drive's "상위 폴더에서 삭제하시겠습니까?" — removing access here also removes it
 * from every one of those ancestors (not just the nearest — two independent ancestors can each
 * separately share the same person, see ListFileSharesService), so anything else only reachable
 * through them stops being shared with them too.
 */
export function RevokeInheritedDialog({
  open,
  granteeLabel,
  ancestors,
  fileName,
  fileRole,
  onConfirm,
  onCancel,
}: {
  open: boolean
  granteeLabel: string
  /** Root-most first (see ShareModal.onMemberChange) — only `ancestors[0]` is shown by name in
   * the tree (see AccessChangeTree). */
  ancestors: { name: string; role: Role }[]
  fileName: string
  fileRole: Role
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => e.preventDefault()}
      className="m-auto w-full max-w-[33.6rem] rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xl backdrop:bg-black/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
    >
      <h2 className="text-lg font-semibold">상위 폴더에서 삭제하시겠습니까?</h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        이 항목에서 {granteeLabel}의 권한을 삭제하면 상위 폴더에서도 삭제됩니다. 또는 액세스가
        제한된 폴더를 만드세요.
      </p>

      <AccessChangeTree
        ancestors={ancestors.map((a) => ({ name: a.name, before: ROLE_LABELS[a.role] }))}
        file={{ name: fileName, before: ROLE_LABELS[fileRole] }}
        after="삭제"
      />

      <div className="mt-8 flex justify-end gap-6 text-base font-medium">
        <button
          type="button"
          onClick={onCancel}
          className="text-brand-600 hover:underline dark:text-brand-400"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="text-red-600 hover:underline dark:text-red-400"
        >
          상위 항목에서 삭제
        </button>
      </div>
    </dialog>
  )
}
