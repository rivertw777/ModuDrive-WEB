import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react'

export type MarqueeBox = { left: number; top: number; width: number; height: number }

/**
 * Multi-select over an ordered list of row ids: click / Ctrl+click / Shift+click, a drag
 * marquee box for rows tagged `data-row-id` (only starts from blank space — rows themselves
 * are draggable, so dragging *from* a row moves the selection instead of drawing a box),
 * Shift+ArrowUp/ArrowDown to grow or shrink a contiguous range, and Escape to clear.
 * `onEmpty` fires whenever the selection drops to zero, so a parent's single-selection state
 * (e.g. a detail panel) can be kept in sync instead of going stale.
 */
export function useRowSelection(
  containerRef: RefObject<HTMLElement | null>,
  orderedIds: string[],
  onEmpty?: () => void,
) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [box, setBox] = useState<MarqueeBox | null>(null)
  const anchor = useRef<string | null>(null)
  // the "active" end of the range — what arrow keys move from
  const focused = useRef<string | null>(null)

  useEffect(() => {
    if (selected.size === 0) onEmpty?.()
  }, [selected, onEmpty])

  const onRowMouseDown = useCallback(
    (id: string, event: ReactMouseEvent) => {
      if (event.button !== 0) return
      if (event.shiftKey && anchor.current) {
        const from = orderedIds.indexOf(anchor.current)
        const to = orderedIds.indexOf(id)
        if (from !== -1 && to !== -1) {
          const [lo, hi] = from < to ? [from, to] : [to, from]
          setSelected(new Set(orderedIds.slice(lo, hi + 1)))
          focused.current = id
          return
        }
      }
      if (event.metaKey || event.ctrlKey) {
        setSelected((cur) => {
          const next = new Set(cur)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
        anchor.current = id
        focused.current = id
        return
      }
      // Leave an already-selected row alone on mousedown (a drag may be starting, and it
      // should carry the whole group) — collapsing to just this row happens in onClick instead.
      anchor.current = id
      focused.current = id
      setSelected((cur) => (cur.has(id) ? cur : new Set([id])))
    },
    [orderedIds],
  )

  const onContainerMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      if (event.button !== 0) return
      const target = event.target as HTMLElement
      if (target.closest('[data-row-id]')) return
      event.preventDefault()
      setSelected(new Set())
      const startX = event.clientX
      const startY = event.clientY

      const onMove = (moveEvent: MouseEvent) => {
        const left = Math.min(startX, moveEvent.clientX)
        const top = Math.min(startY, moveEvent.clientY)
        const right = Math.max(startX, moveEvent.clientX)
        const bottom = Math.max(startY, moveEvent.clientY)
        setBox({ left, top, width: right - left, height: bottom - top })

        const rows = containerRef.current?.querySelectorAll<HTMLElement>('[data-row-id]') ?? []
        const next = new Set<string>()
        rows.forEach((row) => {
          const r = row.getBoundingClientRect()
          if (r.left < right && r.right > left && r.top < bottom && r.bottom > top) {
            next.add(row.dataset.rowId as string)
          }
        })
        setSelected(next)
        if (next.size > 0) {
          anchor.current =
            anchor.current && next.has(anchor.current) ? anchor.current : [...next][0]
          focused.current = [...next][next.size - 1]
        }
      }
      const onUp = () => {
        setBox(null)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [containerRef],
  )

  useEffect(() => {
    if (selected.size === 0) return
    const onKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement
      if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return
      if (event.key === 'Escape') {
        setSelected(new Set())
        return
      }
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      const from = focused.current ? orderedIds.indexOf(focused.current) : -1
      if (from === -1) return
      const to =
        event.key === 'ArrowUp' ? Math.max(0, from - 1) : Math.min(orderedIds.length - 1, from + 1)
      if (to === from) return
      event.preventDefault()
      const nextId = orderedIds[to]
      if (event.shiftKey && anchor.current) {
        const anchorIdx = orderedIds.indexOf(anchor.current)
        const [lo, hi] = anchorIdx < to ? [anchorIdx, to] : [to, anchorIdx]
        setSelected(new Set(orderedIds.slice(lo, hi + 1)))
      } else {
        anchor.current = nextId
        setSelected(new Set([nextId]))
      }
      focused.current = nextId
      document.querySelector(`[data-row-id="${nextId}"]`)?.scrollIntoView({ block: 'nearest' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [orderedIds, selected.size])

  return { selected, setSelected, box, onRowMouseDown, onContainerMouseDown }
}

export function MarqueeOverlay({ box }: { box: MarqueeBox | null }) {
  if (!box) return null
  return (
    <div
      className="pointer-events-none fixed z-40 border border-violet-400 bg-violet-400/10"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    />
  )
}

/** Small floating card used as the native drag image so dragging shows what/how many is moving. */
export function setDragPreview(event: React.DragEvent, label: string, count: number) {
  const el = document.createElement('div')
  el.className =
    'fixed -left-[999px] -top-[999px] flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-lg'
  el.textContent = count > 1 ? `${label} 외 ${count - 1}개` : label
  document.body.appendChild(el)
  event.dataTransfer.setDragImage(el, 12, 16)
  requestAnimationFrame(() => el.remove())
}
