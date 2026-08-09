import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type ContextMenuPosition = { x: number; y: number }

export function ContextMenu({
  position,
  onClose,
  children,
}: {
  position: ContextMenuPosition
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // ponytail: measure-after-mount flip; a resize observer would track live reflow but menus are static once open
  const [style, setStyle] = useState<{ top: number; left: number; visibility: 'hidden' | 'visible' }>({
    top: position.y,
    left: position.x,
    visibility: 'hidden',
  })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { offsetWidth: w, offsetHeight: h } = el
    const left = position.x + w > window.innerWidth ? Math.max(0, position.x - w) : position.x
    const top = position.y + h > window.innerHeight ? Math.max(0, position.y - h) : position.y
    setStyle({ top, left, visibility: 'visible' })
  }, [position.x, position.y])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      style={style}
      className="fixed z-50 min-w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-700"
    >
      {children}
    </div>
  )
}

export function ContextMenuItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-600',
        danger ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200',
      )}
    >
      {children}
    </button>
  )
}
