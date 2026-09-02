import { useEffect, useRef } from 'react'
import { FileIcon, FolderIcon } from '@/components/ui/icons'
import type { InheritedLink } from '../types'

/**
 * Shown when the owner tries to set a file to RESTRICTED but its "anyone with the link" access
 * is inherited from one or more directories above it. There is no per-item inheritance break, so
 * the only way to restrict the file is to turn those directory links off — which also restricts
 * everything else under them. Mirrors Google Drive's "상위 폴더의 액세스 권한을 삭제하시겠습니까?".
 */
export function RestrictParentDialog({
  open,
  fileName,
  folders,
  includesThisItem,
  onConfirm,
  onCancel,
}: {
  open: boolean
  fileName: string
  folders: InheritedLink[]
  /** The file also has its own link, so it's one more row that goes RESTRICTED. */
  includesThisItem: boolean
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
      className="m-auto w-full max-w-[31.92rem] rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xl backdrop:bg-black/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
    >
      <h2 className="text-lg font-semibold">상위 폴더의 액세스 권한을 삭제하시겠습니까?</h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        이 항목의 링크를 제한하려면 상위 폴더의 링크도 함께 삭제됩니다. 그러면 해당 폴더 안의 다른
        항목도 더 이상 링크로 공유되지 않습니다.
      </p>

      <ul className="mt-5 space-y-1">
        {folders.map((folder, index) => (
          <li
            key={folder.fileId}
            style={{ marginLeft: index * 20 }}
            className="flex items-center gap-2 text-sm"
          >
            <FolderIcon size={18} className="shrink-0 text-brand-500" />
            <TransitionRow name={folder.name} />
          </li>
        ))}
        <li
          style={{ marginLeft: folders.length * 20 }}
          className="flex items-center gap-2 text-sm"
        >
          <FileIcon size={18} className="shrink-0 text-slate-400 dark:text-slate-500" />
          <TransitionRow
            name={fileName}
            note={includesThisItem ? undefined : '상위 폴더에서 상속됨'}
          />
        </li>
      </ul>

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

function TransitionRow({ name, note }: { name: string; note?: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{name}</span>
      <span className="block text-xs text-slate-500 dark:text-slate-400">
        {note ?? '링크가 있는 모든 사용자'} → 제한됨
      </span>
    </span>
  )
}
