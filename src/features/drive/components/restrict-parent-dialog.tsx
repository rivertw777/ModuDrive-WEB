import { useEffect, useRef } from 'react'
import type { InheritedLink } from '../types'
import { AccessChangeTree } from './access-change-tree'

// Every row shown here uniformly loses "anyone with the link" — unlike RevokeInheritedDialog's
// per-person role, there's no per-row value to look up (turning a link off isn't about any one
// grantee's role).
const LINK_LABEL = '링크가 있는 모든 사용자'

/**
 * Shown when the owner tries to set a file to RESTRICTED but its "anyone with the link" access
 * is inherited from one or more directories above it. There is no per-item inheritance break, so
 * the only way to restrict the file is to turn those directory links off — which also restricts
 * everything else under them. Mirrors Google Drive's "상위 폴더의 액세스 권한을 삭제하시겠습니까?".
 */
export function RestrictParentDialog({
  open,
  folders,
  fileName,
  onConfirm,
  onCancel,
}: {
  open: boolean
  /** Root-most first — only `folders[0]` is shown by name in the tree (see AccessChangeTree). */
  folders: InheritedLink[]
  fileName: string
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
      <h2 className="text-lg font-semibold">상위 폴더의 액세스 권한을 삭제하시겠습니까?</h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        이 항목 링크를 삭제하면 상위 폴더의 링크도 삭제됩니다. 또는 액세스가 제한된 폴더를
        만드세요.
      </p>

      <AccessChangeTree
        ancestors={folders.map((folder) => ({ name: folder.name, before: LINK_LABEL }))}
        file={{ name: fileName, before: LINK_LABEL }}
        after="제한됨"
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
