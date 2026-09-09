import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { SortHeader } from '@/components/ui/sort-header'
import { ContextMenu, ContextMenuItem, type ContextMenuPosition } from '@/components/ui/context-menu'
import { ChevronRightIcon, DownloadIcon, FolderIcon } from '@/components/ui/icons'
import { useFileViewStore } from '@/stores/file-view-store'
import { useForceLightMode } from '@/hooks/use-force-light-mode'
import { useWindowedList } from '@/hooks/use-windowed-list'
import { usePublicChildren } from '../api/get-public-file'
import { downloadPublicFile } from '../api/download-public-file'
import { formatDate, formatFileSize, sortFiles, type PublicFile, type SortDir, type SortField } from '../types'
import { EntryIcon } from './entry-icon'
import { ViewToggle } from './view-toggle'
import { FileViewerModal } from './file-viewer-modal'

type Crumb = { id: string; name: string }
type MenuState = ContextMenuPosition & { entry: PublicFile }

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

  // Single click: directories navigate straight in (nothing to preview). Files only preview on
  // double-click (or the context menu's 상세보기), matching FileList's authenticated row behavior.
  // Idempotent on the trail — a double-click fires two `click`s before the `dblclick`, and
  // without this guard the second click would push the same folder onto the trail twice.
  const onOpen = (entry: PublicFile) => {
    if (!entry.directory) return
    setTrail((t) => (t[t.length - 1]?.id === entry.fileId ? t : [...t, { id: entry.fileId, name: entry.name }]))
  }
  const onOpenPreview = (entry: PublicFile) => {
    if (!entry.directory) setPreview(entry)
  }
  const openMenu = (entry: PublicFile, event: React.MouseEvent) => {
    if (entry.directory) return
    event.preventDefault()
    setMenu({ entry, x: event.clientX, y: event.clientY })
  }

  const goToDepth = (depth: number) => setTrail((t) => t.slice(0, depth))

  const sorted = entries ? sortFiles(entries, sortField, sortDir) : []
  // Same client-side windowing as the other explorer lists (FileList) — the whole folder already
  // arrived in one response, this just caps how many rows/cards paint until the sentinel scrolls
  // into view. Only 내 드라이브's root listing uses real server-side cursor paging; everywhere
  // else, including this one, windows what already loaded.
  const { visible, hasMore, sentinelRef } = useWindowedList(sorted, `${currentId}:${sortField}:${sortDir}`)
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
        <Link
          to="/login"
          className="inline-flex h-9 shrink-0 items-center rounded-full bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          로그인
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-3 flex justify-end">
          <ViewToggle />
        </div>
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="폴더를 불러오지 못했습니다" />}
        {entries && entries.length === 0 && <EmptyState label="이 폴더는 비어 있습니다" />}

        {sorted.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visible.map((entry) => (
              <button
                key={entry.fileId}
                type="button"
                onClick={() => onOpen(entry)}
                onDoubleClick={() => onOpenPreview(entry)}
                onContextMenu={(event) => openMenu(entry, event)}
                className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center hover:bg-slate-50"
              >
                <EntryIcon name={entry.name} directory={entry.directory} size={72} />
                <span className="line-clamp-2 w-full text-sm break-all text-slate-800">
                  {entry.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {sorted.length > 0 && viewMode === 'list' && (
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
                  onDoubleClick={() => onOpenPreview(entry)}
                  onContextMenu={(event) => openMenu(entry, event)}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-3 py-2.5">
                    <EntryIcon name={entry.name} directory={entry.directory} />
                  </td>
                  <td className="p-0 text-slate-800">
                    <button
                      type="button"
                      onClick={() => onOpen(entry)}
                      className="block w-full truncate px-3 py-2.5 text-left"
                    >
                      {entry.name}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{formatDate(entry.updatedAt)}</td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {entry.directory ? '-' : formatFileSize(entry.fileSize)}
                  </td>
                  <td className="py-2.5 pr-2 text-right">
                    {!entry.directory && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          downloadPublicFile(entry.fileId, shareKey, entry.name)
                        }}
                        aria-label={`${entry.name} 다운로드`}
                        className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      >
                        <DownloadIcon size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {hasMore && <div ref={sentinelRef} aria-hidden className="h-8" />}
      </div>

      {menu && (
        <ContextMenu position={menu} onClose={() => setMenu(null)}>
          <ContextMenuItem
            onClick={() => {
              downloadPublicFile(menu.entry.fileId, shareKey, menu.entry.name)
              setMenu(null)
            }}
          >
            <DownloadIcon size={16} /> 다운로드
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
