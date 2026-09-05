import { useEffect, useRef } from 'react'

/**
 * Shown when removing someone's direct access to a file would be a no-op: they also have a
 * separate grant on a directory above it, which keeps letting them in regardless. Mirrors Google
 * Drive's "상위 폴더에서 삭제하시겠습니까?" — removing access here also removes it from that
 * ancestor, so anything else only reachable through that ancestor stops being shared with them
 * too (that's a client-side simplification, not something this dialog spells out further).
 */
export function RevokeInheritedDialog({
  open,
  granteeLabel,
  ancestorName,
  onConfirm,
  onCancel,
}: {
  open: boolean
  granteeLabel: string
  ancestorName: string
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
        이 항목에서 {granteeLabel}의 권한을 삭제하면 상위 폴더 &quot;{ancestorName}&quot;에서도
        삭제됩니다. 그러면 해당 폴더 안의 다른 항목도 더 이상 이 사용자와 공유되지 않습니다.
      </p>

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
