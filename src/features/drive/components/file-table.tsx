import { EntryIcon } from '@/components/file/entry-icon'
import { MoreVerticalIcon, StarIcon } from '@/components/ui/icons'
import { SortHeader } from '@/components/ui/sort-header'
import { ROLE_LABELS } from '@/features/sharing'
import type { FileEntry, SortDir, SortField } from '@/types/file'
import { cn } from '@/utils/cn'
import { formatDate, formatFileSize } from '@/utils/file'
import type { RowProps } from './file-grid-card'

export type DateColumn = { label: string; getValue: (file: FileEntry) => string | null | undefined }

/** Column set of the list's table view: 공유 문서함 swaps 크기/날짜 for 공유한 사용자/권한/공유된 날짜. */
export function FileTableHead({
  sortField,
  sortDir,
  onSort,
  showSharedBy,
  showLocation,
  dateColumn,
}: {
  sortField: SortField
  sortDir: SortDir
  onSort: (field: SortField) => void
  showSharedBy: boolean
  showLocation: boolean
  dateColumn: DateColumn
}) {
  const header = (label: string, field: SortField) => (
    <SortHeader
      label={label}
      active={sortField === field}
      dir={sortField === field ? sortDir : 'asc'}
      onClick={() => onSort(field)}
    />
  )
  return (
    <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
      <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <th className="w-8 py-2 pl-2 font-medium" />
        <th className="w-14 px-3 py-2 font-medium whitespace-nowrap">종류</th>
        <th className="px-3 py-2 font-medium">{header('이름', 'name')}</th>
        {showSharedBy ? (
          <>
            <th className="w-48 px-3 py-2 font-medium">{header('공유한 사용자', 'sharedBy')}</th>
            <th className="w-20 px-3 py-2 font-medium">권한</th>
            <th className="w-44 px-3 py-2 font-medium">{header('공유된 날짜', 'date')}</th>
            <th className="w-28 px-3 py-2 font-medium">{header('크기', 'size')}</th>
          </>
        ) : (
          <>
            <th className="w-28 px-3 py-2 font-medium">{header('크기', 'size')}</th>
            <th className="w-44 px-3 py-2 font-medium">{header(dateColumn.label, 'date')}</th>
          </>
        )}
        {showLocation && <th className="w-32 py-2 pr-4 pl-3 font-medium">위치</th>}
        <th className="w-14 py-2" />
      </tr>
    </thead>
  )
}

/** One file in the list's table view — columns match {@link FileTableHead}. */
export function FileTableRow({
  file,
  rowProps,
  selected,
  dragOver,
  onToggleFavorite,
  onMore,
  showSharedBy,
  dateColumn,
  location,
}: {
  file: FileEntry
  rowProps: RowProps
  selected: boolean
  dragOver: boolean
  onToggleFavorite: () => void
  onMore: (event: React.MouseEvent) => void
  showSharedBy: boolean
  dateColumn: DateColumn
  location?: { label: string; onClick: (event: React.MouseEvent) => void }
}) {
  const size = file.directory ? '-' : formatFileSize(file.fileSize)
  return (
    <tr
      {...rowProps}
      className={cn(
        'cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800',
        selected &&
          'bg-brand-100 hover:bg-brand-100 dark:bg-brand-700/40 dark:hover:bg-brand-700/40',
        dragOver && 'ring-2 ring-inset ring-brand-400',
      )}
    >
      <td className="py-2.5 pl-2">
        <button
          type="button"
          aria-label={file.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite()
          }}
          className="flex items-center text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400"
        >
          <StarIcon
            size={16}
            className={file.favorite ? 'fill-amber-400 text-amber-400' : undefined}
          />
        </button>
      </td>
      <td className="px-3 py-2.5">
        <EntryIcon name={file.name} category={file.category} directory={file.directory} />
      </td>
      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200">{file.name}</td>
      {showSharedBy ? (
        <>
          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
            <SharedByCell file={file} />
          </td>
          <td className="px-3 py-2.5">
            {file.role && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                {ROLE_LABELS[file.role]}
              </span>
            )}
          </td>
          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
            {formatDate(file.sharedAt ?? null)}
          </td>
          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{size}</td>
        </>
      ) : (
        <>
          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{size}</td>
          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
            {formatDate(dateColumn.getValue(file) ?? null)}
          </td>
        </>
      )}
      {location && (
        <td className="py-2.5 pr-4 pl-3">
          <button
            type="button"
            onClick={location.onClick}
            className="rounded-md px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            {location.label}
          </button>
        </td>
      )}
      <td className="py-2.5 pr-2 text-right">
        <button
          type="button"
          aria-label="더보기"
          onClick={(event) => {
            event.stopPropagation()
            onMore(event)
          }}
          className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <MoreVerticalIcon size={16} />
        </button>
      </td>
    </tr>
  )
}

/** "공유한 사용자" cell for the shared-with-me list: sharer email (name only if email is unknown). */
function SharedByCell({ file }: { file: FileEntry }) {
  return (
    <span className="block truncate text-slate-600 dark:text-slate-300">
      {file.sharedByEmail ?? file.sharedByName ?? '알 수 없음'}
    </span>
  )
}
