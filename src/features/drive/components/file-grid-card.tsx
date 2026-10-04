import type { HTMLAttributes } from 'react'
import { EntryIcon } from '@/components/file/entry-icon'
import { MoreVerticalIcon, StarIcon } from '@/components/ui/icons'
import type { FileEntry } from '@/types/file'
import { cn } from '@/utils/cn'

/** Selection/drag/open wiring the list spreads onto both a grid card and a table row. */
export type RowProps = HTMLAttributes<HTMLElement> & { 'data-row-id': string; draggable: boolean }

/** One file in the list's grid view. `rowProps` carries the selection/drag/open wiring the
 * list shares between this card and the table row. */
export function FileGridCard({
  file,
  rowProps,
  selected,
  dragOver,
  onToggleFavorite,
  onMore,
  location,
}: {
  file: FileEntry
  rowProps: RowProps
  selected: boolean
  dragOver: boolean
  onToggleFavorite: () => void
  onMore: (event: React.MouseEvent) => void
  location?: { label: string; onClick: (event: React.MouseEvent) => void }
}) {
  return (
    <div
      {...rowProps}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
        selected &&
          'border-brand-300 bg-brand-100 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-700/40 dark:hover:bg-brand-700/40',
        dragOver && 'ring-2 ring-inset ring-brand-400',
      )}
    >
      <button
        type="button"
        aria-label={file.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite()
        }}
        className="absolute top-1.5 left-1.5 flex size-9 items-center justify-center rounded-full text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400"
      >
        <StarIcon
          size={20}
          className={file.favorite ? 'fill-amber-400 text-amber-400' : undefined}
        />
      </button>
      <button
        type="button"
        aria-label="더보기"
        onClick={(event) => {
          event.stopPropagation()
          onMore(event)
        }}
        className="absolute top-1.5 right-1.5 flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <MoreVerticalIcon size={20} />
      </button>
      <EntryIcon
        name={file.name}
        category={file.category}
        directory={file.directory}
        size={72}
        className="mt-8"
      />
      <span className="line-clamp-2 w-full text-sm break-all text-slate-800 dark:text-slate-200">
        {file.name}
      </span>
      {location && (
        <button
          type="button"
          onClick={location.onClick}
          className="max-w-full truncate text-xs text-slate-500 hover:underline dark:text-slate-400"
        >
          {location.label}
        </button>
      )}
    </div>
  )
}
