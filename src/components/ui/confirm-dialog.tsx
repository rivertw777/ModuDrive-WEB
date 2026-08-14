import { useEffect, useRef } from 'react'

/** Minimal, chrome-less confirm — message plus two text-link actions, no title
 * bar or backdrop dimming of its own (meant to stack over an already-open Dialog). */
export function ConfirmDialog({
  open,
  message,
  confirmLabel,
  cancelLabel = '취소',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  message: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
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
      // Only the 취소/저장 buttons can dismiss this one — ESC and backdrop clicks are
      // deliberately swallowed so an accidental click/keypress can't drop the decision.
      onCancel={(e) => e.preventDefault()}
      // Width: 95% of the main share modal's width (size="lg" there is 33.6rem).
      // Padding/spacing below scaled to ~80% of the previous pass to cut height too.
      className="m-auto w-full max-w-[31.92rem] rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xl backdrop:bg-transparent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
    >
      <p className="text-lg">{message}</p>
      <div className="mt-8 flex justify-end gap-6 text-base font-medium">
        <button
          type="button"
          onClick={onCancel}
          className="text-violet-600 hover:underline dark:text-violet-400"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={
            danger
              ? 'text-red-600 hover:underline dark:text-red-400'
              : 'text-violet-600 hover:underline dark:text-violet-400'
          }
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
