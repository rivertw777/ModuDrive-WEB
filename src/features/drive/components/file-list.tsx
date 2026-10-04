import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentMember } from '@/features/auth'
import { ShareModal } from '@/features/sharing'
import { EmptyState, type EmptyStateIcon } from '@/components/ui/state'
import type { ContextMenuPosition } from '@/components/ui/context-menu'
import { useFileViewStore } from '@/stores/file-view-store'
import { actionErrorText } from '@/stores/alert-store'
import type { FileEntry, SortDir, SortField } from '@/types/file'
import { useSortState } from '@/hooks/use-sort-state'
import { MarqueeOverlay, useRowSelection } from '@/hooks/use-row-selection'
import { useInfiniteScrollRef, useWindowedList } from '@/hooks/use-windowed-list'
import { joinPath, locationLabel, sortFiles } from '@/utils/file'
import { runBatch } from '@/utils/run-batch'
import { downloadFile } from '../api/download-file'
import { downloadArchive } from '../api/download-archive'
import { useToggleFavorite } from '../api/toggle-favorite'
import { useFileDragMove } from '../hooks/use-file-drag-move'
import { BatchContextMenu, FileContextMenu, type FileDialogType } from './file-context-menu'
import { FileGridCard, type RowProps } from './file-grid-card'
import { FileTableHead, FileTableRow, type DateColumn } from './file-table'
import { RenameDialog } from './rename-dialog'
import { MoveDialog } from './move-dialog'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { FileViewerModal } from './file-viewer-modal'

type DialogState = { type: FileDialogType; files: FileEntry[] }
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
  showSharedBy = false,
  emptyLabel = '이 폴더는 비어 있습니다',
  emptyIcon,
  preserveOrder = false,
  serverPagination,
  // What the "date" column shows/sorts by — 수정한 날짜 (updatedAt) everywhere except
  // 즐겨찾기/최근 문서함, which show when *this list's* thing happened instead.
  dateColumn = { label: '수정한 날짜', getValue: (file: FileEntry) => file.updatedAt },
}: {
  files: FileEntry[]
  selectedFileId: string | null
  onNavigate: (path: string) => void
  onSelect: (file: FileEntry) => void
  onFileDeleted?: (fileId: string) => void
  onClearSelection?: () => void
  navigable?: boolean
  showLocation?: boolean
  showSharedBy?: boolean
  emptyLabel?: string
  emptyIcon?: EmptyStateIcon
  preserveOrder?: boolean
  serverPagination?: ServerPagination
  dateColumn?: DateColumn
}) {
  // Date-descending is the default everywhere in the app (내 드라이브/휴지통 and up), so every
  // FileList instance opens the same way — a click still opts into a real client-side sort.
  const localSort = useSortState<SortField>('date', 'desc')
  const sortField = serverPagination?.sortField ?? localSort.sortField
  const sortDir = serverPagination?.sortDir ?? localSort.sortDir
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [viewerFile, setViewerFile] = useState<FileEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const viewMode = useFileViewStore((state) => state.mode)
  const toggleFavorite = useToggleFavorite()
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { data: me } = useCurrentMember()

  // In recent / favorites, a file the viewer doesn't own lives in 공유 문서함, not their drive.
  // While `me` is still loading we can't confirm ownership, so treat the file as shared for
  // action-gating (hide owner-only menu items rather than 403 on click) but keep the real path
  // as the location label until we know.
  const isSharedFile = (file: FileEntry) => file.ownerId !== me?.id
  const locationText = (file: FileEntry) =>
    me && isSharedFile(file) ? '공유 문서함' : locationLabel(file.path)
  const openLocation = (file: FileEntry, event: React.MouseEvent) => {
    event.stopPropagation()
    // Land in the right box with this file's detail panel open (?file= deep link), rather than
    // just changing folders and closing the panel.
    const fileParam = `?file=${encodeURIComponent(file.fileId)}`
    if (isSharedFile(file)) {
      navigate(`/shared${fileParam}`)
    } else {
      navigate(`/drive${file.path === '/' ? '' : file.path}${fileParam}`)
    }
  }

  const toggleSort = (field: SortField) => {
    if (serverPagination) {
      serverPagination.onSortChange(field)
      return
    }
    localSort.toggleSort(field)
  }

  const nonDeleted = files.filter((file) => file.status !== 'DELETED' && file.status !== 'TRASHED')
  // preserveOrder holds the server's order only until the user clicks a header; serverPagination
  // means the server is already sorting/paging, so client sort never applies there.
  const unsortedPreserve = preserveOrder && !localSort.touched
  const skipClientSort = unsortedPreserve || serverPagination
  // Server mode: `files` already arrives sorted (directories first) and paged — don't re-sort
  // or window it here, just render every loaded page and let the sentinel pull the next one.
  const visible = skipClientSort
    ? nonDeleted
    : sortFiles(nonDeleted, sortField, sortDir, dateColumn.getValue)
  const clientWindow = useWindowedList(
    visible,
    `${skipClientSort ? 'order' : sortField}:${sortDir}`,
  )
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
  const { dragOverId, dragHandlers } = useFileDragMove({
    files: visible,
    selected,
    setSelected,
    setActionError,
  })
  const selectedFiles = shown.filter((file) => selected.has(file.fileId))
  const downloadableSelected = selectedFiles.filter(
    (file) => file.directory || file.status === 'UPLOADED',
  )
  // One plain file downloads as itself; a folder or several items come down as one zip.
  const download = (files: FileEntry[]) => {
    if (files.length === 1 && !files[0].directory) {
      downloadFile(files[0].fileId, files[0].name)
      return
    }
    downloadArchive(files.map((file) => file.fileId)).catch((error) => setActionError(actionErrorText(error)))
  }

  const toggleFavoriteOf = (file: FileEntry) =>
    toggleFavorite.mutate(
      { fileId: file.fileId, favorite: !file.favorite },
      { onError: (error) => setActionError(actionErrorText(error)) },
    )
  const setFavoriteOfSelected = async (favorite: boolean) => {
    setActionError(null)
    const targets = selectedFiles.filter((file) => file.favorite !== favorite)
    const { failed, error } = await runBatch(targets, (file) =>
      toggleFavorite.mutateAsync({ fileId: file.fileId, favorite }),
    )
    if (failed.length > 0) setActionError(actionErrorText(error))
  }

  const openMenu = (file: FileEntry, x: number, y: number) => {
    const batch = selected.has(file.fileId) && selected.size > 1
    if (!batch) setSelected(new Set([file.fileId]))
    setMenu({ file, x, y, batch })
  }

  // Shared across the table row and grid card — both are just a `data-row-id` element wired
  // to the same selection/drag/navigate behavior, so only the layout differs between views.
  const rowProps = (file: FileEntry): RowProps => ({
    'data-row-id': file.fileId,
    ...dragHandlers(file),
    onMouseDown: (event: React.MouseEvent) => onRowMouseDown(file.fileId, event),
    onClick: (event: React.MouseEvent) => {
      // Single click only selects — entering a folder or previewing a file is a double-click
      // (below), so a click-and-hold is free to start a drag instead of jumping the folder.
      if (event.shiftKey || event.metaKey || event.ctrlKey) return
      setSelected(new Set([file.fileId]))
    },
    onDoubleClick: (event: React.MouseEvent) => {
      // Row buttons (star, more, location) stop propagation on click, not dblclick — the
      // second click of a double-click on one of them would otherwise still bubble up here.
      if ((event.target as HTMLElement).closest('button')) return
      if (file.directory) {
        if (!navigable) return
        setSelected(new Set())
        onNavigate(joinPath(file.path, file.name))
      } else if (file.status === 'UPLOADED') {
        setViewerFile(file)
      }
    },
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault()
      openMenu(file, event.clientX, event.clientY)
    },
  })
  // What a card/row needs besides its layout — identical for both views.
  const itemProps = (file: FileEntry) => ({
    file,
    rowProps: rowProps(file),
    selected: selected.has(file.fileId) || selectedFileId === file.fileId,
    dragOver: dragOverId === file.fileId,
    onToggleFavorite: () => toggleFavoriteOf(file),
    onMore: (event: React.MouseEvent) => openMenu(file, event.clientX, event.clientY),
    location: showLocation
      ? {
          label: locationText(file),
          onClick: (event: React.MouseEvent) => openLocation(file, event),
        }
      : undefined,
  })

  // Viewer's ◀/▶ step through this same folder listing, previewable files only (matches what
  // double-click can open) — `visible` so paging/windowing doesn't cut the sibling list short.
  const previewableFiles = visible.filter((file) => !file.directory && file.status === 'UPLOADED')
  const viewerIndex = viewerFile
    ? previewableFiles.findIndex((file) => file.fileId === viewerFile.fileId)
    : -1

  return (
    <>
      {actionError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      {visible.length === 0 ? (
        <EmptyState label={emptyLabel} icon={emptyIcon} />
      ) : (
        <div
          ref={containerRef}
          onMouseDown={onContainerMouseDown}
          className="relative min-h-full flex-1"
        >
          <MarqueeOverlay box={box} />
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {shown.map((file) => (
                <FileGridCard key={file.fileId} {...itemProps(file)} />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <FileTableHead
                sortField={sortField}
                sortDir={sortDir}
                onSort={toggleSort}
                showSharedBy={showSharedBy}
                showLocation={showLocation}
                dateColumn={dateColumn}
              />
              <tbody>
                {shown.map((file) => (
                  <FileTableRow
                    key={file.fileId}
                    {...itemProps(file)}
                    showSharedBy={showSharedBy}
                    dateColumn={dateColumn}
                  />
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
        <FileContextMenu
          position={menu}
          file={menu.file}
          shared={isSharedFile(menu.file)}
          onClose={() => setMenu(null)}
          onDetail={() => onSelect(menu.file)}
          onDownload={() => download([menu.file])}
          onDialog={(type) => setDialog({ type, files: [menu.file] })}
          onToggleFavorite={() => toggleFavoriteOf(menu.file)}
        />
      )}

      {menu?.batch && (
        <BatchContextMenu
          position={menu}
          files={selectedFiles}
          downloadable={downloadableSelected}
          anyShared={selectedFiles.some(isSharedFile)}
          onClose={() => setMenu(null)}
          onDownload={() => download(downloadableSelected)}
          onDialog={(type) => setDialog({ type, files: selectedFiles })}
          onSetFavorite={(favorite) => void setFavoriteOfSelected(favorite)}
        />
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
          canShare={!isSharedFile(viewerFile)}
          onPrev={
            viewerIndex > 0 ? () => setViewerFile(previewableFiles[viewerIndex - 1]) : undefined
          }
          onNext={
            viewerIndex >= 0 && viewerIndex < previewableFiles.length - 1
              ? () => setViewerFile(previewableFiles[viewerIndex + 1])
              : undefined
          }
        />
      )}
    </>
  )
}
