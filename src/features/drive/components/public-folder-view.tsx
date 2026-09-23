import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { SortHeader } from '@/components/ui/sort-header'
import { ContextMenu, ContextMenuItem, type ContextMenuPosition } from '@/components/ui/context-menu'
import { ChevronRightIcon, DownloadIcon, FolderIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { useFileViewStore } from '@/stores/file-view-store'
import { useForceLightMode } from '@/hooks/use-force-light-mode'
import { useWindowedList } from '@/hooks/use-windowed-list'
import { usePublicChildren } from '../api/get-public-file'
import { downloadPublicFile } from '../api/download-public-file'
import { alertDownloadFailure, downloadPublicArchive } from '../api/download-archive'
import { formatDate, formatFileSize, sortFiles, type PublicFile, type SortDir, type SortField } from '../types'
import { MarqueeOverlay, useRowSelection } from '../hooks/use-row-selection'
import { EntryIcon } from './entry-icon'
import { ViewToggle } from './view-toggle'
import { FileViewerModal } from './file-viewer-modal'

type Crumb = { id: string; name: string }
type MenuState = ContextMenuPosition & { entry: PublicFile; batch: boolean }

/** Anonymous browser for a link-shared folder — its own tree, like PublicFileView, so no
 * authenticated UI leaks to a visitor. Navigates by entry id: the path segment is the folder
 * (or file) currently open, `shareKey` stays the root link's key throughout. Same light table
 * look as the app's own "공유 문서함" list (FileList), including its grid/list toggle — minus
 * columns an anonymous link has no data for (공유한 사용자/권한 — PublicFile deliberately hides
 * the owner) and minus favorite/move/share/delete, which need an authenticated account. */
export function PublicFolderView({
  fileId,
  shareKey,
  rootName,
}: {
  fileId: string
  shareKey: string | null
  rootName: string
}) {
  const [trail, setTrail] = useState<Crumb[]>([])
  const [preview, setPreview] = useState<PublicFile | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const viewMode = useFileViewStore((state) => state.mode)
  const containerRef = useRef<HTMLDivElement>(null)
  // This page is light-only (bg-white below), but a stored/OS dark preference on <html> still
  // leaks `dark:` utilities from shared components (ViewToggle, EntryIcon, ...) — same fix as
  // the auth routes (see the hook).
  useForceLightMode()

  const currentId = trail[trail.length - 1]?.id ?? fileId
  const { data: entries, isLoading, isError } = usePublicChildren(currentId, shareKey)

  const toggleSort = (field: SortField) => {
    if (field === sortField) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Single click only selects (highlight) — matches FileList's authenticated row behavior.
  // Double-click activates: directories navigate straight in, files open the preview.
  const onActivate = (entry: PublicFile) => {
    if (entry.directory) {
      setSelected(new Set())
      setTrail((t) => [...t, { id: entry.fileId, name: entry.name }])
    } else {
      setPreview(entry)
    }
  }

  const goToDepth = (depth: number) => {
    setSelected(new Set())
    setTrail((t) => t.slice(0, depth))
  }

  const sorted = entries ? sortFiles(entries, sortField, sortDir) : []
  // Same client-side windowing as the other explorer lists (FileList) — the whole folder already
  // arrived in one response, this just caps how many rows/cards paint until the sentinel scrolls
  // into view. Only 내 드라이브's root listing uses real server-side cursor paging; everywhere
  // else, including this one, windows what already loaded.
  const { visible, hasMore, sentinelRef } = useWindowedList(sorted, `${currentId}:${sortField}:${sortDir}`)
  // Same drag-to-marquee-select as FileList — no move/drag-out here (anonymous visitors can't
  // move files), just rectangle multi-select so a right-click batch-downloads the selection.
  const { selected, setSelected, box, onRowMouseDown, onContainerMouseDown } = useRowSelection(
    containerRef,
    visible.map((entry) => entry.fileId),
  )
  const selectedEntries = visible.filter((entry) => selected.has(entry.fileId))
  // One plain file downloads as itself; a folder or several items come down as one zip.
  const download = (picked: PublicFile[]) => {
    if (picked.length === 1 && !picked[0].directory) {
      downloadPublicFile(picked[0].fileId, shareKey, picked[0].name)
      return
    }
    downloadPublicArchive(
      picked.map((entry) => entry.fileId),
      shareKey,
    ).catch(alertDownloadFailure)
  }

  const openMenu = (entry: PublicFile, event: React.MouseEvent) => {
    const batch = selected.has(entry.fileId) && selected.size > 1
    if (!batch) setSelected(new Set([entry.fileId]))
    event.preventDefault()
    setMenu({ entry, x: event.clientX, y: event.clientY, batch })
  }
  // Left/right chevrons and Arrow keys (handled inside FileViewerModal) step through the full
  // (unwindowed) folder listing, files only.
  const siblings = sorted.filter((entry) => !entry.directory)
  const previewIndex = preview ? siblings.findIndex((entry) => entry.fileId === preview.fileId) : -1
  const onPrev = previewIndex > 0 ? () => setPreview(siblings[previewIndex - 1]) : undefined
  const onNext =
    previewIndex >= 0 && previewIndex < siblings.length - 1
      ? () => setPreview(siblings[previewIndex + 1])
      : undefined

  return (
    <div className="flex h-dvh flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-8 py-3 text-slate-800 shadow-sm">
        <nav className="flex min-w-0 items-center gap-1 text-sm">
          <FolderIcon size={22} className="mr-1 shrink-0 text-brand-500" />
          <button
            type="button"
            onClick={() => goToDepth(0)}
            className="max-w-[12rem] truncate rounded px-1.5 py-0.5 font-medium hover:bg-slate-100"
          >
            {rootName}
          </button>
          {trail.map((crumb, index) => (
            <span key={crumb.id} className="flex min-w-0 items-center gap-1">
              <ChevronRightIcon size={14} className="shrink-0 text-slate-400" />
              <button
                type="button"
                onClick={() => goToDepth(index + 1)}
                className="max-w-[12rem] truncate rounded px-1.5 py-0.5 font-medium hover:bg-slate-100"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => downloadPublicArchive([currentId], shareKey).catch(alertDownloadFailure)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <DownloadIcon size={16} /> 폴더 다운로드
          </button>
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-full bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            로그인
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-3 flex justify-end">
          <ViewToggle />
        </div>
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="폴더를 불러오지 못했습니다" />}
        {entries && entries.length === 0 && <EmptyState label="이 폴더는 비어 있습니다" />}

        {sorted.length > 0 && (
          <div
            ref={containerRef}
            onMouseDown={onContainerMouseDown}
            className="relative min-h-[50vh]"
          >
            <MarqueeOverlay box={box} />
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {visible.map((entry) => (
                  <button
                    key={entry.fileId}
                    type="button"
                    data-row-id={entry.fileId}
                    onMouseDown={(event) => onRowMouseDown(entry.fileId, event)}
                    onClick={(event) => {
                      if (event.shiftKey || event.metaKey || event.ctrlKey) return
                      setSelected(new Set([entry.fileId]))
                    }}
                    onDoubleClick={() => onActivate(entry)}
                    onContextMenu={(event) => openMenu(entry, event)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center hover:bg-slate-50',
                      selected.has(entry.fileId) &&
                        'border-brand-300 bg-brand-100 hover:bg-brand-100',
                    )}
                  >
                    <EntryIcon name={entry.name} directory={entry.directory} size={72} />
                    <span className="line-clamp-2 w-full text-sm break-all text-slate-800">
                      {entry.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {viewMode === 'list' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="w-14 px-3 py-2 font-medium whitespace-nowrap">종류</th>
                    <th className="px-3 py-2 font-medium">
                      <SortHeader
                        label="이름"
                        active={sortField === 'name'}
                        dir={sortField === 'name' ? sortDir : 'asc'}
                        onClick={() => toggleSort('name')}
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
                    <th className="w-28 px-3 py-2 font-medium">
                      <SortHeader
                        label="크기"
                        active={sortField === 'size'}
                        dir={sortField === 'size' ? sortDir : 'asc'}
                        onClick={() => toggleSort('size')}
                      />
                    </th>
                    <th className="w-14 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((entry) => (
                    <tr
                      key={entry.fileId}
                      data-row-id={entry.fileId}
                      onMouseDown={(event) => onRowMouseDown(entry.fileId, event)}
                      onClick={(event) => {
                        if (event.shiftKey || event.metaKey || event.ctrlKey) return
                        setSelected(new Set([entry.fileId]))
                      }}
                      onDoubleClick={() => onActivate(entry)}
                      onContextMenu={(event) => openMenu(entry, event)}
                      className={cn(
                        'cursor-pointer border-b border-slate-100 hover:bg-slate-50',
                        selected.has(entry.fileId) && 'bg-brand-100 hover:bg-brand-100',
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <EntryIcon name={entry.name} directory={entry.directory} />
                      </td>
                      <td className="px-3 py-2.5 truncate text-slate-800">{entry.name}</td>
                      <td className="px-3 py-2.5 text-slate-500">{formatDate(entry.updatedAt)}</td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {entry.directory ? '-' : formatFileSize(entry.fileSize)}
                      </td>
                      <td className="py-2.5 pr-2 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            download([entry])
                          }}
                          aria-label={`${entry.name} 다운로드`}
                          className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        >
                          <DownloadIcon size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {hasMore && <div ref={sentinelRef} aria-hidden className="h-8" />}
          </div>
        )}
      </div>

      {menu && !menu.batch && (
        <ContextMenu position={menu} onClose={() => setMenu(null)}>
          <ContextMenuItem
            onClick={() => {
              download([menu.entry])
              setMenu(null)
            }}
          >
            <DownloadIcon size={16} /> 다운로드
          </ContextMenuItem>
        </ContextMenu>
      )}

      {menu?.batch && (
        <ContextMenu position={menu} onClose={() => setMenu(null)}>
          <ContextMenuItem
            onClick={() => {
              download(selectedEntries)
              setMenu(null)
            }}
          >
            <DownloadIcon size={16} /> 다운로드 ({selectedEntries.length}개)
          </ContextMenuItem>
        </ContextMenu>
      )}

      {preview && (
        <FileViewerModal
          open
          onClose={() => setPreview(null)}
          fileId={preview.fileId}
          fileName={preview.name}
          fileSize={preview.fileSize}
          canShare={false}
          source={{ type: 'public', fileId: preview.fileId, shareKey }}
          onDownload={() => downloadPublicFile(preview.fileId, shareKey, preview.name)}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </div>
  )
}
