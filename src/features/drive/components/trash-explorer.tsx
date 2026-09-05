import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuItem,
  type ContextMenuPosition,
} from '@/components/ui/context-menu'
import { SortHeader } from '@/components/ui/sort-header'
import { MoreVerticalIcon, RestoreIcon, TrashIcon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/utils/cn'
import { useTrash } from '../api/list-trash'
import { useRestoreFile } from '../api/restore-file'
import {
  formatDate,
  formatFileSize,
  locationLabel,
  sortFiles,
  type FileEntry,
  type SortDir,
  type SortField,
} from '../types'
import { MarqueeOverlay, useRowSelection } from '../hooks/use-row-selection'
import { useWindowedList } from '@/hooks/use-windowed-list'
import { useFileDeeplink } from '../hooks/use-file-deeplink'
import { runBatch } from '@/utils/run-batch'
import { useFileViewStore } from '@/stores/file-view-store'
import { EntryIcon } from './entry-icon'
import { TrashDetailPanel } from './trash-detail-panel'
import { PurgeConfirmDialog } from './purge-confirm-dialog'
import { EmptyTrashConfirmDialog } from './empty-trash-confirm-dialog'
import { ViewToggle } from './view-toggle'

type MenuState = ContextMenuPosition & { file: FileEntry; batch: boolean }

export function TrashExplorer() {
  const navigate = useNavigate()
  const { data: files, isLoading, isError } = useTrash()
  // `?file=<id>` deep link — a "위치" link from 저장용량 lands here with the file's detail open.
  const { selectedFileId, setSelectedFileId, clearSelection } = useFileDeeplink()
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [purgeTargets, setPurgeTargets] = useState<FileEntry[] | null>(null)
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const restoreFile = useRestoreFile()
  const containerRef = useRef<HTMLDivElement>(null)
  const viewMode = useFileViewStore((state) => state.mode)

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const selectedFile = files?.find((file) => file.fileId === selectedFileId) ?? null
  const sorted = files ? sortFiles(files, sortField, sortDir, (file) => file.trashedAt) : []
  const {
    visible: shown,
    hasMore,
    sentinelRef,
  } = useWindowedList(sorted, `${sortField}:${sortDir}`)
  // Selection domain must match what's rendered — a batch permanent-delete resolves this list,
  // so it must never contain rows the user can't see (keyboard nav past the window).
  const { selected, setSelected, box, onRowMouseDown, onContainerMouseDown } = useRowSelection(
    containerRef,
    shown.map((file) => file.fileId),
    clearSelection,
  )
  const selectedFiles = shown.filter((file) => selected.has(file.fileId))

  const openMenu = (file: FileEntry, x: number, y: number) => {
    const batch = selected.has(file.fileId) && selected.size > 1
    if (!batch) setSelected(new Set([file.fileId]))
    setMenu({ file, x, y, batch })
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <PageHeader title="휴지통">
          <ViewToggle />
        </PageHeader>

        {files && files.length > 0 && (
          <div className="mb-4 flex shrink-0 items-center justify-between gap-2 rounded-lg bg-slate-100 py-1.5 pr-2 pl-4 dark:bg-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              휴지통에 있는 항목은 30일 후 자동으로 삭제됩니다.
            </p>
            <Button variant="ghost" onClick={() => setEmptyTrashOpen(true)}>
              휴지통 비우기
            </Button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {actionError && (
            <p className="mb-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>
          )}

          {isLoading && <LoadingState />}
          {isError && <ErrorState message="휴지통을 불러오지 못했습니다" />}
          {files && files.length === 0 && (
            <EmptyState label="휴지통이 비어 있습니다" icon={TrashIcon} />
          )}
          {files && files.length > 0 && (
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
                      data-row-id={file.fileId}
                      onMouseDown={(event) => onRowMouseDown(file.fileId, event)}
                      onClick={(event) => {
                        if (event.shiftKey || event.metaKey || event.ctrlKey) return
                        setSelected(new Set([file.fileId]))
                        setSelectedFileId(file.fileId)
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        openMenu(file, event.clientX, event.clientY)
                      }}
                      className={cn(
                        'group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                        (selected.has(file.fileId) || selectedFileId === file.fileId) &&
                          'border-brand-200 bg-brand-50 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-700/25 dark:hover:bg-brand-700/25',
                      )}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openMenu(file, e.clientX, e.clientY)
                        }}
                        aria-label="더보기"
                        className="absolute top-1.5 right-1.5 flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <MoreVerticalIcon size={20} />
                      </button>
                      <EntryIcon
                        name={file.name}
                        category={file.category}
                        directory={file.directory}
                        size={72}
                      />
                      <span className="line-clamp-2 w-full text-sm break-all text-slate-800 dark:text-slate-200">
                        {file.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/drive${file.path === '/' ? '' : file.path}`)
                        }}
                        className="max-w-full truncate text-xs text-slate-500 hover:underline dark:text-slate-400"
                      >
                        {locationLabel(file.path)}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="w-14 py-2 font-medium whitespace-nowrap">종류</th>
                      <th className="py-2 font-medium">
                        <SortHeader
                          label="이름"
                          active={sortField === 'name'}
                          dir={sortField === 'name' ? sortDir : 'asc'}
                          onClick={() => toggleSort('name')}
                        />
                      </th>
                      <th className="w-24 py-2 font-medium">
                        <SortHeader
                          label="크기"
                          active={sortField === 'size'}
                          dir={sortField === 'size' ? sortDir : 'asc'}
                          onClick={() => toggleSort('size')}
                        />
                      </th>
                      <th className="w-44 py-2 font-medium">
                        <SortHeader
                          label="휴지통에 버린 날짜"
                          active={sortField === 'date'}
                          dir={sortField === 'date' ? sortDir : 'asc'}
                          onClick={() => toggleSort('date')}
                        />
                      </th>
                      <th className="w-32 py-2 pr-4 font-medium">원래 위치</th>
                      <th className="w-14 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((file) => (
                      <tr
                        key={file.fileId}
                        data-row-id={file.fileId}
                        onMouseDown={(event) => onRowMouseDown(file.fileId, event)}
                        onClick={(event) => {
                          if (event.shiftKey || event.metaKey || event.ctrlKey) return
                          setSelected(new Set([file.fileId]))
                          setSelectedFileId(file.fileId)
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault()
                          openMenu(file, event.clientX, event.clientY)
                        }}
                        className={cn(
                          'cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800',
                          (selected.has(file.fileId) || selectedFileId === file.fileId) &&
                            'bg-brand-50 hover:bg-brand-50 dark:bg-brand-700/25 dark:hover:bg-brand-700/25',
                        )}
                      >
                        <td className="py-2.5">
                          <EntryIcon
                            name={file.name}
                            category={file.category}
                            directory={file.directory}
                          />
                        </td>
                        <td className="py-2.5 text-slate-800 dark:text-slate-200">{file.name}</td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">
                          {file.directory ? '-' : formatFileSize(file.fileSize)}
                        </td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">
                          {formatDate(file.trashedAt ?? null)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/drive${file.path === '/' ? '' : file.path}`)
                            }}
                            className="rounded-md px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          >
                            {locationLabel(file.path)}
                          </button>
                        </td>
                        <td className="py-2.5 pr-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openMenu(file, e.clientX, e.clientY)
                            }}
                            aria-label="더보기"
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
            </div>
          )}
        </div>
      </div>

      {selectedFile && <TrashDetailPanel file={selectedFile} onClose={clearSelection} />}

      {menu && !menu.batch && (
        <ContextMenu position={menu} onClose={() => setMenu(null)}>
          <ContextMenuItem
            onClick={() => {
              restoreFile.mutate(menu.file.fileId)
              setMenu(null)
            }}
          >
            <RestoreIcon size={16} /> 복원
          </ContextMenuItem>
          <ContextMenuItem
            danger
            onClick={() => {
              setPurgeTargets([menu.file])
              setMenu(null)
            }}
          >
            <TrashIcon size={16} /> 영구 삭제
          </ContextMenuItem>
        </ContextMenu>
      )}

      {menu?.batch && (
        <ContextMenu position={menu} onClose={() => setMenu(null)}>
          <ContextMenuItem
            onClick={async () => {
              setMenu(null)
              setActionError(null)
              const failed = await runBatch(selectedFiles, (file) =>
                restoreFile.mutateAsync(file.fileId),
              )
              setSelected(new Set())
              if (failed.length > 0) setActionError(`${failed.length}개 항목 복원에 실패했습니다`)
            }}
          >
            <RestoreIcon size={16} /> 복원 ({selectedFiles.length}개)
          </ContextMenuItem>
          <ContextMenuItem
            danger
            onClick={() => {
              setPurgeTargets(selectedFiles)
              setMenu(null)
            }}
          >
            <TrashIcon size={16} /> 영구 삭제 ({selectedFiles.length}개)
          </ContextMenuItem>
        </ContextMenu>
      )}

      {purgeTargets && (
        <PurgeConfirmDialog
          open
          onClose={() => setPurgeTargets(null)}
          files={purgeTargets}
          onPurged={() => {
            const purgedIds = new Set(purgeTargets.map((file) => file.fileId))
            setSelectedFileId((cur) => (cur && purgedIds.has(cur) ? null : cur))
            setSelected(new Set())
          }}
        />
      )}

      {emptyTrashOpen && (
        <EmptyTrashConfirmDialog
          open
          onClose={() => {
            setEmptyTrashOpen(false)
            setSelectedFileId(null)
            setSelected(new Set())
          }}
        />
      )}
    </div>
  )
}
