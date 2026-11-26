import { useEffect, useId, useRef } from 'react'
import { ClockIcon } from '@/components/ui/icons'

/** Shown when an API call fails during the demo's night stop (isNightStop) — the service-hours
 * notice, in place of the generic server-error alert. */
export function NightStopDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // Same frame and layout as AlertDialog (icon badge, text, 확인 link), in brand colour
      // instead of its red: this is a notice, not an error.
      className="m-auto w-full max-w-[33.6rem] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-black/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
          <ClockIcon size={20} />
        </span>
        <div className="pt-1.5">
          <h2 id={titleId} className="text-base font-semibold">
            서비스 이용 시간 안내
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            이용 가능 시간: 매일 08:00 ~ 24:00
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end text-base font-medium">
        <button
          type="button"
          onClick={onClose}
          className="text-brand-600 hover:underline dark:text-brand-400"
        >
          확인
        </button>
      </div>
    </dialog>
  )
}
