import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeftIcon, HelpCircleIcon, XIcon } from './icons'

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  // ~1.4x the default max-w-sm (24rem), for dialogs with denser content (e.g. sharing).
  lg: 'max-w-[33.6rem]',
} as const

export function Dialog({
  open,
  onClose,
  title,
  children,
  size = 'sm',
  onBack,
  closeButton = 'x',
  helpContent,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: keyof typeof SIZE_CLASSES
  /** Shows a back arrow before the title (e.g. a sub-view within the dialog). */
  onBack?: () => void
  /** 'x' (default) closes on click. 'help' shows a "?" button that reveals a
   * tooltip with `helpContent` on hover. */
  closeButton?: 'x' | 'help'
  helpContent?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpPos, setHelpPos] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (!open) setHelpOpen(false)
  }, [open])

  const showHelp = () => {
    const rect = helpButtonRef.current?.getBoundingClientRect()
    if (rect) setHelpPos({ top: rect.top - 8, right: window.innerWidth - rect.right })
    setHelpOpen(true)
  }
  const hideHelp = () => setHelpOpen(false)

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        // Prevent the native ESC auto-close so this and the backdrop-click handler
        // below are the only two paths into onClose — otherwise the browser's own
        // close (fired right after) would call it a second time for one keypress.
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // The dialog element's own box has no padding (p-0) — a click landing on
        // it directly, rather than on a descendant, is a click on the backdrop.
        if (e.target === e.currentTarget) onClose()
      }}
      // overflow-visible overrides <dialog>'s UA-stylesheet default of overflow:auto,
      // which otherwise clips the fixed-position help tooltip below. It has to stay a
      // DOM descendant of <dialog> (not portaled to <body>) to inherit the dialog's
      // browser "top layer" stacking — body-level content can never out-rank that.
      className={`m-auto w-full ${SIZE_CLASSES[size]} overflow-visible rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-black/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="뒤로"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <ArrowLeftIcon size={26} />
              </button>
            )}
            <h2 className="min-w-0 truncate text-lg font-semibold">{title}</h2>
          </div>
          {closeButton === 'help' ? (
            <button
              ref={helpButtonRef}
              type="button"
              onMouseEnter={showHelp}
              onMouseLeave={hideHelp}
              aria-label="도움말"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <HelpCircleIcon size={26} />
            </button>
          ) : (
            <button
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
        <div className="mt-4">{children}</div>
      </div>
      {helpOpen && helpContent && helpPos && (
        <div
          style={{ position: 'fixed', top: helpPos.top, right: helpPos.right, transform: 'translateY(-100%)' }}
          className="w-max max-w-[90vw] whitespace-nowrap rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {helpContent}
        </div>
      )}
    </dialog>
  )
}
