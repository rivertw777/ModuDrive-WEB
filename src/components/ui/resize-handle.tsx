import { cn } from '@/utils/cn'

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
