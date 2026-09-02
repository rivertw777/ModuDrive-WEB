import { useCallback, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

/**
 * Drag-to-resize width for a fixed-width panel, persisted to localStorage under `storageKey`.
 * `handleEdge: 'right'` = handle sits on the panel's right edge (e.g. left sidebar).
 * `handleEdge: 'left'` = handle sits on the panel's left edge (e.g. right detail panel).
 */
export function useResizableWidth(
  storageKey: string,
  defaultWidth: number,
  min: number,
  max: number,
  handleEdge: 'left' | 'right',
) {
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(storageKey))
    return stored >= min && stored <= max ? stored : defaultWidth
  })
  const startRef = useRef({ x: 0, width: 0 })

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startRef.current = { x: e.clientX, width }
      const sign = handleEdge === 'right' ? 1 : -1

      const onMove = (moveEvent: MouseEvent) => {
        const delta = (moveEvent.clientX - startRef.current.x) * sign
        setWidth(Math.min(max, Math.max(min, startRef.current.width + delta)))
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        setWidth((current) => {
          localStorage.setItem(storageKey, String(current))
          return current
        })
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [width, handleEdge, min, max, storageKey],
  )

  return { width, onMouseDown }
}

export function ResizeHandle({
  edge,
  onMouseDown,
}: {
  edge: 'left' | 'right'
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        'absolute top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-400/50 active:bg-brand-400/50',
        edge === 'right' ? '-right-0.5' : '-left-0.5',
      )}
    />
  )
}
