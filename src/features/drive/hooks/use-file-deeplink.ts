import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * `?file=<id>` deep link for an explorer: seeds the selected file from the URL so the detail
 * panel opens, strips the param once consumed (so a later back/refresh doesn't force it open),
 * and ignores FileList's one mount-time `onClearSelection` call so the seeded selection survives.
 *
 * Used by every explorer a "위치" link or a notification can land on with a file pre-selected.
 */
export function useFileDeeplink() {
  const [searchParams, setSearchParams] = useSearchParams()
  const fileParam = searchParams.get('file')

  const [selectedFileId, setSelectedFileId] = useState<string | null>(fileParam)

  // A FileList (child, or inline via useRowSelection) fires onClearSelection once when it mounts
  // with an empty marquee selection. That mount can land a tick — or several hundred ms, once its
  // list query resolves — after this hook, so we swallow the first clear by count, not by clock:
  // a deep-linked selection has to survive it whenever it arrives.
  const swallowNextClearRef = useRef(fileParam != null)

  useEffect(() => {
    if (!fileParam) return
    setSelectedFileId(fileParam)
    swallowNextClearRef.current = true
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('file')
        return next
      },
      { replace: true },
    )
  }, [fileParam, setSearchParams])

  const clearSelection = useCallback(() => {
    if (swallowNextClearRef.current) {
      swallowNextClearRef.current = false
      return
    }
    setSelectedFileId(null)
  }, [])

  return { selectedFileId, setSelectedFileId, clearSelection }
}
