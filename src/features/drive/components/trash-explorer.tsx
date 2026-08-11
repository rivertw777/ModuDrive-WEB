import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import {
  ContextMenu,
  ContextMenuItem,
  type ContextMenuPosition,
} from '@/components/ui/context-menu'
import { SortHeader } from '@/components/ui/sort-header'
import {
  FileIcon,
  FolderIcon,
  ImageIcon,
  MoreVerticalIcon,
  RestoreIcon,
  TrashIcon,
} from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { useTrash } from '../api/list-trash'
import { useRestoreFile } from '../api/restore-file'
import {
  formatDate,
  formatFileSize,
  isImageFile,
  locationLabel,
  sortFiles,
  type FileEntry,
  type SortDir,
  type SortField,
} from '../types'
import { MarqueeOverlay, useRowSelection } from '../hooks/use-row-selection'
import { runBatch } from '@/utils/run-batch'
import { TrashDetailPanel } from './trash-detail-panel'
import { PurgeConfirmDialog } from './purge-confirm-dialog'

function EntryIcon({ file }: { file: FileEntry }) {
  if (file.directory) return <FolderIcon size={20} className="shrink-0 text-violet-500" />
  if (isImageFile(file.name)) return <ImageIcon size={20} className="shrink-0 text-emerald-500" />
  return <FileIcon size={20} className="shrink-0 text-slate-400 dark:text-slate-500" />
}

type MenuState = ContextMenuPosition & { file: FileEntry; batch: boolean }

export function TrashExplorer() {
  const navigate = useNavigate()
  const { data: files, isLoading, isError } = useTrash()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [purgeTargets, setPurgeTargets] = useState<FileEntry[] | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const restoreFile = useRestoreFile()
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const selectedFile = files?.find((file) => file.fileId === selectedFileId) ?? null
  const sorted = files ? sortFiles(files, sortField, sortDir) : []
  const { selected, setSelected, box, onRowMouseDown, onContainerMouseDown } = useRowSelection(
    containerRef,
    sorted.map((file) => file.fileId),
    () => setSelectedFileId(null),
  )
  const selectedFiles = sorted.filter((file) => selected.has(file.fileId))

  const openMenu = (file: FileEntry, x: number, y: number) => {
    const batch = selected.has(file.fileId) && selected.size > 1
    if (!batch) setSelected(new Set([file.fileId]))
    setMenu({ file, x, y, batch })
  }

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 p-6">
        <h1 className="pb-4 text-lg font-medium text-slate-900 dark:text-slate-100">휴지통</h1>

        {actionError && (
          <p className="mb-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>
        )}

        {isLoading && <LoadingState />}
        {isError && <ErrorState message="휴지통을 불러오지 못했습니다" />}
        {files && files.length === 0 && <EmptyState label="휴지통이 비어 있습니다" />}
        {files && files.length > 0 && (
          <div
            ref={containerRef}
            onMouseDown={onContainerMouseDown}
            className="relative min-h-[50vh]"
          >
            <MarqueeOverlay box={box} />
            <table className="w-full text-sm">
              <thead>
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
                {sorted.map((file) => (
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
                        'bg-violet-50 hover:bg-violet-50 dark:bg-violet-950 dark:hover:bg-violet-950',
                    )}
                  >
                    <td className="py-2.5">
                      <EntryIcon file={file} />
                    </td>
                    <td className="py-2.5 text-slate-800 dark:text-slate-200">{file.name}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">
                      {file.directory ? '-' : formatFileSize(file.fileSize)}
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">
                      {formatDate(file.updatedAt)}
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
          </div>
        )}
      </div>

      {selectedFile && (
        <TrashDetailPanel file={selectedFile} onClose={() => setSelectedFileId(null)} />
      )}

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
    </div>
  )
}
