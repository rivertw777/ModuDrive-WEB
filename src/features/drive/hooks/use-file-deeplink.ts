import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * `?file=<id>` deep link for an explorer: seeds the selected file from the URL so the detail
 * panel opens, and strips the param once consumed (so a later back/refresh doesn't force it
 * open again).
 *
 * Used by every explorer a "위치" link or a notification can land on with a file pre-selected.
 * Relies on useRowSelection not firing its mount-time `onClearSelection` for an already-empty
 * selection — otherwise a FileList mounting after this (its list query resolves later than the
 * deep link is seeded, which is the common case) would immediately clear it back out.
 */
export function useFileDeeplink() {
  const [searchParams, setSearchParams] = useSearchParams()
  const fileParam = searchParams.get('file')

  const [selectedFileId, setSelectedFileId] = useState<string | null>(fileParam)

  useEffect(() => {
    if (!fileParam) return
    setSelectedFileId(fileParam)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('file')
        return next
      },
      { replace: true },
    )
  }, [fileParam, setSearchParams])

  const clearSelection = useCallback(() => setSelectedFileId(null), [])

  return { selectedFileId, setSelectedFileId, clearSelection }
}
