import { useEffect, useId, useRef } from 'react'
import { AlertCircleIcon } from './icons'

/** Minimal, chrome-less warning notice — an icon badge plus a single 확인 acknowledgement. Same
 * red-on-icon language as ErrorState/upload-status-panel's error rows, the app's one existing
 * "경고" visual convention, just in dialog form. Has its own backdrop dimming (unlike
 * ConfirmDialog, which stacks over an already-open Dialog) since this one is meant to stand alone
 * on whatever page is behind it. */
export function AlertDialog({
  open,
  message,
  onAcknowledge,
}: {
  open: boolean
  message: string
  onAcknowledge: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const messageId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-describedby={messageId}
      // Only 확인 dismisses this one — same reasoning as ConfirmDialog: an accidental ESC or
      // backdrop click must not silently drop a notice the caller needs acknowledged.
      onCancel={(e) => e.preventDefault()}
      className="m-auto w-full max-w-[33.6rem] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-black/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircleIcon size={20} />
        </span>
        <p id={messageId} className="whitespace-pre-line pt-1.5 text-base">
          {message}
        </p>
      </div>
      <div className="mt-6 flex justify-end text-base font-medium">
        <button
          type="button"
          onClick={onAcknowledge}
          className="text-brand-600 hover:underline dark:text-brand-400"
        >
          확인
        </button>
      </div>
    </dialog>
  )
}
