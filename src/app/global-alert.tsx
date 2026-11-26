import { AlertDialog } from '@/components/ui/alert-dialog'
import { NightStopDialog } from '@/app/night-stop-dialog'
import { useAlertStore } from '@/stores/alert-store'

/** Mounted once at the app root so a queued alert (see useAlertStore) renders on top of
 * whatever page is current when it fires — including a page navigated to right before show(). */
export function GlobalAlert() {
  const message = useAlertStore((s) => s.message)
  const nightStop = useAlertStore((s) => s.nightStop)
  const dismiss = useAlertStore((s) => s.dismiss)

  return (
    <>
      <AlertDialog open={message !== null} message={message ?? ''} onAcknowledge={dismiss} />
      <NightStopDialog open={nightStop} onClose={dismiss} />
    </>
  )
}
