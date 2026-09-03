import { useRef, useState } from 'react'
import { EmptyState, type EmptyStateIcon } from '@/components/ui/state'
import {
  ContextMenu,
  ContextMenuItem,
  type ContextMenuPosition,
} from '@/components/ui/context-menu'
import { SortHeader } from '@/components/ui/sort-header'
import {
  DownloadIcon,
  InfoIcon,
  MoreVerticalIcon,
  MoveIcon,
  PencilIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
} from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { useFileViewStore } from '@/stores/file-view-store'
import {
  formatDate,
  formatFileSize,
  joinPath,
  locationLabel,
  sortFiles,
  type FileEntry,
  type SortDir,
  type SortField,
} from '../types'
import { downloadFile } from '../api/download-file'
import { useToggleFavorite } from '../api/toggle-favorite'
import { useMoveFile } from '../api/move-file'
import { MarqueeOverlay, setDragPreview, useRowSelection } from '../hooks/use-row-selection'
import { useInfiniteScrollRef, useWindowedList } from '../hooks/use-windowed-list'
import { runBatch } from '@/utils/run-batch'
import { EntryIcon } from './entry-icon'
import { RenameDialog } from './rename-dialog'
import { MoveDialog } from './move-dialog'
import { ShareModal } from './share-modal'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { FileViewerModal } from './file-viewer-modal'

// Private MIME type for in-list drags (moving files between folders) — keeps them from being
// mistaken for (or matched by) an OS file drag, and from being read by a foreign drop target.
const DRAG_MIME = 'application/x-modudrive-file-ids'

type DialogState = { type: 'rename' | 'move' | 'share' | 'delete'; files: FileEntry[] }
type MenuState = ContextMenuPosition & { file: FileEntry; batch: boolean }

/** When set, the list is already sorted and paged by the server: `files` holds every page
 * loaded so far, sort-header clicks go to `onSortChange` (which restarts from page 1), and the
 * scroll sentinel calls `onLoadMore`. Client-side sorting/windowing is bypassed. */
export type ServerPagination = {
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  sortField: SortField
  sortDir: SortDir
  onSortChange: (field: SortField) => void
}

export function FileList({
  files,
  selectedFileId,
  onNavigate,
  onSelect,
  onFileDeleted,
  onClearSelection,
  navigable = true,
  showLocation = false,
  emptyLabel = '이 폴더는 비어 있습니다',
  emptyIcon,
  preserveOrder = false,
  serverPagination,
}: {
  files: FileEntry[]
  selectedFileId: string | null
  onNavigate: (path: string) => void
  onSelect: (file: FileEntry) => void
  onFileDeleted?: (fileId: string) => void
  onClearSelection?: () => void
  navigable?: boolean
  showLocation?: boolean
  emptyLabel?: string
  emptyIcon?: EmptyStateIcon
  preserveOrder?: boolean
  serverPagination?: ServerPagination
}) {
  const [localSortField, setLocalSortField] = useState<SortField>('name')
  const [localSortDir, setLocalSortDir] = useState<SortDir>('asc')
  const sortField = serverPagination?.sortField ?? localSortField
  const sortDir = serverPagination?.sortDir ?? localSortDir
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [viewerFile, setViewerFile] = useState<FileEntry | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const viewMode = useFileViewStore((state) => state.mode)
  const toggleFavorite = useToggleFavorite()
  const moveFile = useMoveFile()
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleSort = (field: SortField) => {
    if (serverPagination) {
      serverPagination.onSortChange(field)
      return
    }
    if (field === localSortField) {
      setLocalSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setLocalSortField(field)
      setLocalSortDir('asc')
    }
  }

  const nonDeleted = files.filter((file) => file.status !== 'DELETED')
  // Server mode: `files` already arrives sorted (directories first) and paged — don't re-sort
  // or window it here, just render every loaded page and let the sentinel pull the next one.
  const visible =
    preserveOrder || serverPagination ? nonDeleted : sortFiles(nonDeleted, sortField, sortDir)
  const clientWindow = useWindowedList(visible, `${preserveOrder ? 'order' : sortField}:${sortDir}`)
  const serverSentinelRef = useInfiniteScrollRef(
    serverPagination?.hasMore ?? false,
    () => serverPagination?.onLoadMore(),
    serverPagination?.isLoadingMore,
  )
  const shown = serverPagination ? visible : clientWindow.visible
  const sentinelRef = serverPagination ? serverSentinelRef : clientWindow.sentinelRef
  const hasMore = serverPagination ? serverPagination.hasMore : clientWindow.hasMore
  // Selection domain must match what's rendered — keyboard nav indexes into this list, and a
  // batch delete resolves it. Handing it rows that aren't in the DOM lets Shift+Arrow select
  // (and permanently delete) files the user can't see.
  const { selected, setSelected, box, onRowMouseDown, onContainerMouseDown } = useRowSelection(
    containerRef,
    shown.map((file) => file.fileId),
    onClearSelection,
  )
  const selectedFiles = shown.filter((file) => selected.has(file.fileId))

  const openMenu = (file: FileEntry, x: number, y: number) => {
    const batch = selected.has(file.fileId) && selected.size > 1
    if (!batch) setSelected(new Set([file.fileId]))
    setMenu({ file, x, y, batch })
  }

  const onDragStart = (event: React.DragEvent, file: FileEntry) => {
    const ids = selected.has(file.fileId) && selected.size > 1 ? [...selected] : [file.fileId]
    if (ids.length === 1) setSelected(new Set(ids))
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids))
    setDragPreview(event, file.name, ids.length)
  }

  const onDrop = async (event: React.DragEvent, target: FileEntry) => {
    event.preventDefault()
    setDragOverId(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(event.dataTransfer.getData(DRAG_MIME))
    } catch {
      return
    }
    if (!Array.isArray(parsed)) return

    // Only ids this list actually rendered, excluding the drop target itself and any dragged
    // directory that the target sits inside of (would otherwise move a folder into its own subtree).
    const byId = new Map(visible.map((file) => [file.fileId, file]))
    const targetFullPath = joinPath(target.path, target.name)
    const ids = parsed.filter((id): id is string => {
      if (typeof id !== 'string' || id === target.fileId) return false
      const source = byId.get(id)
      if (!source || source.path === targetFullPath) return false
      if (!source.directory) return true
      const sourceFullPath = joinPath(source.path, source.name)
      return targetFullPath !== sourceFullPath && !targetFullPath.startsWith(`${sourceFullPath}/`)
    })
    if (ids.length === 0) return

    setActionError(null)
    const failed = await runBatch(ids, (fileId) =>
      moveFile.mutateAsync({ fileId, path: targetFullPath }),
    )
    setSelected(new Set())
    if (failed.length > 0) setActionError(`${failed.length}개 항목을 이동하지 못했습니다`)
  }

  // Shared across the table row and grid card — both are just a `data-row-id` element wired
  // to the same selection/drag/navigate behavior, so only the layout differs between views.
  const rowHandlers = (file: FileEntry) => ({
    'data-row-id': file.fileId,
    draggable: true,
    onDragStart: (event: React.DragEvent) => onDragStart(event, file),
    onMouseDown: (event: React.MouseEvent) => onRowMouseDown(file.fileId, event),
    onClick: (event: React.MouseEvent) => {
      if (event.shiftKey || event.metaKey || event.ctrlKey) return
      if (file.directory && navigable) {
        setSelected(new Set())
        onNavigate(joinPath(file.path, file.name))
      } else {
        setSelected(new Set([file.fileId]))
      }
    },
    onDoubleClick: (event: React.MouseEvent) => {
      // Row buttons (star, more, location) stop propagation on click, not dblclick — the
      // second click of a double-click on one of them would otherwise still bubble up here.
      if ((event.target as HTMLElement).closest('button')) return
      if (!file.directory && file.status === 'UPLOADED') setViewerFile(file)
    },
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault()
      openMenu(file, event.clientX, event.clientY)
    },
    onDragOver: file.directory
      ? (event: React.DragEvent) => {
          if (!event.dataTransfer.types.includes(DRAG_MIME)) return
          event.preventDefault()
          setDragOverId(file.fileId)
        }
      : undefined,
    onDragLeave: file.directory
      ? () => setDragOverId((cur) => (cur === file.fileId ? null : cur))
      : undefined,
    onDrop: file.directory ? (event: React.DragEvent) => onDrop(event, file) : undefined,
  })

  return (
    <>
      {actionError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      {visible.length === 0 ? (
        <EmptyState label={emptyLabel} icon={emptyIcon} />
      ) : (
        <div
          ref={containerRef}
          onMouseDown={onContainerMouseDown}
          className="relative min-h-[50vh]"
        >
          <MarqueeOverlay box={box} />
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {shown.map((file) => (
                <div
                  key={file.fileId}
                  {...rowHandlers(file)}
                  className={cn(
                    'group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                    (selected.has(file.fileId) || selectedFileId === file.fileId) &&
                      'border-brand-200 bg-brand-50 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-700/25 dark:hover:bg-brand-700/25',
                    dragOverId === file.fileId && 'ring-2 ring-inset ring-brand-400',
                  )}
                >
                  <button
                    type="button"
                    aria-label={file.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleFavorite.mutate({ fileId: file.fileId, favorite: !file.favorite })
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
                      openMenu(file, event.clientX, event.clientY)
                    }}
                    className="absolute top-1.5 right-1.5 flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    <MoreVerticalIcon size={20} />
                  </button>
                  <EntryIcon name={file.name} category={file.category} directory={file.directory} size={72} className="mt-8" />
                  <span className="line-clamp-2 w-full text-sm break-all text-slate-800 dark:text-slate-200">
                    {file.name}
                  </span>
                  {showLocation && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onNavigate(file.path)
                      }}
                      className="max-w-full truncate text-xs text-slate-500 hover:underline dark:text-slate-400"
                    >
                      {locationLabel(file.path)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="w-8 py-2 pl-2 font-medium" />
                  <th className="w-14 px-3 py-2 font-medium whitespace-nowrap">종류</th>
                  <th className="px-3 py-2 font-medium">
                    <SortHeader
                      label="이름"
                      active={sortField === 'name'}
                      dir={sortField === 'name' ? sortDir : 'asc'}
                      onClick={() => toggleSort('name')}
                    />
                  </th>
                  <th className="w-28 px-3 py-2 font-medium">
                    <SortHeader
                      label="크기"
                      active={sortField === 'size'}
                      dir={sortField === 'size' ? sortDir : 'asc'}
                      onClick={() => toggleSort('size')}
                    />
                  </th>
                  <th className="w-44 px-3 py-2 font-medium">
                    <SortHeader
                      label="수정한 날짜"
                      active={sortField === 'date'}
                      dir={sortField === 'date' ? sortDir : 'asc'}
                      onClick={() => toggleSort('date')}
                    />
                  </th>
                  {showLocation && <th className="w-32 py-2 pr-4 pl-3 font-medium">위치</th>}
                  <th className="w-14 py-2" />
                </tr>
              </thead>
              <tbody>
                {shown.map((file) => (
                  <tr
                    key={file.fileId}
                    {...rowHandlers(file)}
                    className={cn(
                      'cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800',
                      (selected.has(file.fileId) || selectedFileId === file.fileId) &&
                        'bg-brand-50 hover:bg-brand-50 dark:bg-brand-700/25 dark:hover:bg-brand-700/25',
                      dragOverId === file.fileId && 'ring-2 ring-inset ring-brand-400',
                    )}
                  >
                    <td className="py-2.5 pl-2">
                      <button
                        type="button"
                        aria-label={file.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleFavorite.mutate({ fileId: file.fileId, favorite: !file.favorite })
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
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                      {file.directory ? '-' : formatFileSize(file.fileSize)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                      {formatDate(file.updatedAt)}
                    </td>
                    {showLocation && (
                      <td className="py-2.5 pr-4 pl-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onNavigate(file.path)
                          }}
                          className="rounded-md px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                        >
                          {locationLabel(file.path)}
                        </button>
                      </td>
                    )}
                    <td className="py-2.5 pr-2 text-right">
                      <button
                        type="button"
                        aria-label="더보기"
                        onClick={(event) => {
                          event.stopPropagation()
                          openMenu(file, event.clientX, event.clientY)
                        }}
                        className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <MoreVerticalIcon size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {hasMore && <div ref={sentinelRef} aria-hidden className="h-8" />}
          {serverPagination?.isLoadingMore && (
            <p className="py-3 text-center text-sm text-slate-400 dark:text-slate-500">
              불러오는 중…
            </p>
          )}
        </div>
      )}

      {menu && !menu.batch && (
        <ContextMenu position={menu} onClose={() => setMenu(null)}>
          <ContextMenuItem
            onClick={() => {
              onSelect(menu.file)
              setMenu(null)
            }}
          >
            <InfoIcon size={16} /> 상세보기
          </ContextMenuItem>
          {!menu.file.directory && menu.file.status === 'UPLOADED' && (
            <ContextMenuItem
              onClick={() => {
                downloadFile(menu.file.fileId, menu.file.name)
                setMenu(null)
              }}
            >
              <DownloadIcon size={16} /> 다운로드
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onClick={() => {
              setDialog({ type: 'rename', files: [menu.file] })
              setMenu(null)
            }}
          >
            <PencilIcon size={16} /> 이름 바꾸기
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              setDialog({ type: 'move', files: [menu.file] })
              setMenu(null)
            }}
          >
            <MoveIcon size={16} /> 이동
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              setDialog({ type: 'share', files: [menu.file] })
              setMenu(null)
            }}
          >
            <ShareIcon size={16} /> 공유
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              toggleFavorite.mutate({ fileId: menu.file.fileId, favorite: !menu.file.favorite })
              setMenu(null)
            }}
          >
            <StarIcon size={16} /> {menu.file.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          </ContextMenuItem>
          <ContextMenuItem
            danger
            onClick={() => {
              setDialog({ type: 'delete', files: [menu.file] })
              setMenu(null)
            }}
          >
            <TrashIcon size={16} /> 휴지통으로 이동
          </ContextMenuItem>
        </ContextMenu>
      )}

      {menu?.batch && (
        <ContextMenu position={menu} onClose={() => setMenu(null)}>
          {selectedFiles.some((file) => !file.directory && file.status === 'UPLOADED') && (
            <ContextMenuItem
              onClick={() => {
                selectedFiles
                  .filter((file) => !file.directory && file.status === 'UPLOADED')
                  .forEach((file) => downloadFile(file.fileId, file.name))
                setMenu(null)
              }}
            >
              <DownloadIcon size={16} /> 다운로드
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onClick={() => {
              setDialog({ type: 'move', files: selectedFiles })
              setMenu(null)
            }}
          >
            <MoveIcon size={16} /> 이동 ({selectedFiles.length}개)
          </ContextMenuItem>
          {selectedFiles.some((file) => !file.favorite) && (
            <ContextMenuItem
              onClick={async () => {
                setMenu(null)
                setActionError(null)
                const targets = selectedFiles.filter((file) => !file.favorite)
                const failed = await runBatch(targets, (file) =>
                  toggleFavorite.mutateAsync({ fileId: file.fileId, favorite: true }),
                )
                if (failed.length > 0)
                  setActionError(`${failed.length}개 항목의 즐겨찾기 추가에 실패했습니다`)
              }}
            >
              <StarIcon size={16} /> 즐겨찾기 추가
            </ContextMenuItem>
          )}
          {selectedFiles.some((file) => file.favorite) && (
            <ContextMenuItem
              onClick={async () => {
                setMenu(null)
                setActionError(null)
                const targets = selectedFiles.filter((file) => file.favorite)
                const failed = await runBatch(targets, (file) =>
                  toggleFavorite.mutateAsync({ fileId: file.fileId, favorite: false }),
                )
                if (failed.length > 0)
                  setActionError(`${failed.length}개 항목의 즐겨찾기 해제에 실패했습니다`)
              }}
            >
              <StarIcon size={16} /> 즐겨찾기 해제
            </ContextMenuItem>
          )}
          <ContextMenuItem
            danger
            onClick={() => {
              setDialog({ type: 'delete', files: selectedFiles })
              setMenu(null)
            }}
          >
            <TrashIcon size={16} /> 휴지통으로 이동 ({selectedFiles.length}개)
          </ContextMenuItem>
        </ContextMenu>
      )}

      {dialog?.type === 'rename' && (
        <RenameDialog
          open
          onClose={() => setDialog(null)}
          fileId={dialog.files[0].fileId}
          currentName={dialog.files[0].name}
        />
      )}
      {dialog?.type === 'move' && (
        <MoveDialog open onClose={() => setDialog(null)} files={dialog.files} />
      )}
      {dialog?.type === 'share' && (
        <ShareModal
          open
          onClose={() => setDialog(null)}
          fileId={dialog.files[0].fileId}
          fileName={dialog.files[0].name}
        />
      )}
      {dialog?.type === 'delete' && (
        <DeleteConfirmDialog
          open
          onClose={() => setDialog(null)}
          files={dialog.files}
          onDeleted={() => {
            dialog.files.forEach((file) => onFileDeleted?.(file.fileId))
            setSelected(new Set())
          }}
        />
      )}

      {viewerFile && (
        <FileViewerModal
          open
          onClose={() => setViewerFile(null)}
          fileId={viewerFile.fileId}
          fileName={viewerFile.name}
          fileSize={viewerFile.fileSize}
        />
      )}
    </>
  )
}
