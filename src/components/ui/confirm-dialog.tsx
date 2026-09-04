import { useEffect, useId, useRef } from 'react'
import { cn } from '@/utils/cn'

/** Minimal, chrome-less confirm — message plus two text-link actions, no title
 * bar or backdrop dimming of its own (meant to stack over an already-open Dialog). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = '취소',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title?: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
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
      aria-labelledby={title ? titleId : messageId}
      aria-describedby={title ? messageId : undefined}
      // Only the 취소/저장 buttons can dismiss this one — ESC and backdrop clicks are
      // deliberately swallowed so an accidental click/keypress can't drop the decision.
      onCancel={(e) => e.preventDefault()}
      // Width/padding match the main share modal (Dialog size="lg", p-6).
      // Note: no display/`flex` utility on <dialog> itself — an author `display`
      // rule beats the UA `dialog:not([open])` one and the closed dialog would
      // show. Layout lives on the inner wrapper below.
      className="m-auto w-full max-w-[33.6rem] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-transparent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
    >
      {/* With a title it stacks over the share modal; a min-height makes the two
          boxes read at the same size, with the content block centered in it. */}
      <div className={cn(title && 'flex min-h-[11rem] flex-col justify-center')}>
        <div>
          {title && (
            <h2 id={titleId} className="mb-3 text-lg font-semibold">
              {title}
            </h2>
          )}
          <p
            id={messageId}
            className={cn(
              'whitespace-pre-line',
              title ? 'text-sm text-slate-600 dark:text-slate-300' : 'text-lg',
            )}
          >
            {message}
          </p>
        </div>
        <div className="mt-8 flex justify-end gap-6 text-base font-medium">
          <button
            type="button"
            onClick={onCancel}
            // A different colour from the confirm action, but not de-emphasised: on a
            // consent gate (danger) the decline path must not be the quieter one.
            className="text-slate-700 hover:underline dark:text-slate-300"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? 'text-red-600 hover:underline dark:text-red-400'
                : 'text-brand-600 hover:underline dark:text-brand-400'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
