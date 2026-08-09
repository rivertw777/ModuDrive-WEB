import { useState } from 'react'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { ContextMenu, ContextMenuItem, type ContextMenuPosition } from '@/components/ui/context-menu'
import { FileIcon, FolderIcon, ImageIcon, MoreVerticalIcon, RestoreIcon, TrashIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { useTrash } from '../api/list-trash'
import { useRestoreFile } from '../api/restore-file'
import { formatDate, formatFileSize, isImageFile, type FileEntry } from '../types'
import { TrashDetailPanel } from './trash-detail-panel'
import { PurgeConfirmDialog } from './purge-confirm-dialog'

function EntryIcon({ file }: { file: FileEntry }) {
  if (file.directory) return <FolderIcon size={20} className="shrink-0 text-violet-500" />
  if (isImageFile(file.name)) return <ImageIcon size={20} className="shrink-0 text-emerald-500" />
  return <FileIcon size={20} className="shrink-0 text-slate-400 dark:text-slate-500" />
}

export function TrashExplorer() {
  const { data: files, isLoading, isError } = useTrash()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [menu, setMenu] = useState<(ContextMenuPosition & { file: FileEntry }) | null>(null)
  const [purgeTarget, setPurgeTarget] = useState<FileEntry | null>(null)
  const restoreFile = useRestoreFile()

  const selectedFile = files?.find((file) => file.fileId === selectedFileId) ?? null

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 p-6">
        <h1 className="pb-4 text-lg font-medium text-slate-900 dark:text-slate-100">휴지통</h1>

        {isLoading && <LoadingState />}
        {isError && <ErrorState message="휴지통을 불러오지 못했습니다" />}
        {files && files.length === 0 && <EmptyState label="휴지통이 비어 있습니다" />}
        {files && files.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 font-medium">이름</th>
                <th className="w-40 py-2 font-medium">원래 위치</th>
                <th className="w-40 py-2 font-medium">휴지통에 버린 날짜</th>
                <th className="w-24 py-2 pr-4 text-right font-medium">크기</th>
                <th className="w-14 py-2" />
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.fileId}
                  onClick={() => setSelectedFileId(file.fileId)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    setMenu({ file, x: event.clientX, y: event.clientY })
                  }}
                  className={cn(
                    'cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800',
                    selectedFileId === file.fileId &&
                      'bg-violet-50 hover:bg-violet-50 dark:bg-violet-950 dark:hover:bg-violet-950',
                  )}
                >
                  <td className="py-2.5">
                    <span className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
                      <EntryIcon file={file} />
                      {file.name}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{file.path}</td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{formatDate(file.updatedAt)}</td>
                  <td className="py-2.5 pr-4 text-right text-slate-500 dark:text-slate-400">
                    {file.directory ? '-' : formatFileSize(file.fileSize)}
                  </td>
                  <td className="py-2.5 pr-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenu({ file, x: e.clientX, y: e.clientY })
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
      </div>

      {selectedFile && <TrashDetailPanel file={selectedFile} onClose={() => setSelectedFileId(null)} />}

      {menu && (
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
              setPurgeTarget(menu.file)
              setMenu(null)
            }}
          >
            <TrashIcon size={16} /> 영구 삭제
          </ContextMenuItem>
        </ContextMenu>
      )}

      {purgeTarget && (
        <PurgeConfirmDialog
          open
          onClose={() => setPurgeTarget(null)}
          fileId={purgeTarget.fileId}
          fileName={purgeTarget.name}
          onPurged={() => setSelectedFileId((cur) => (cur === purgeTarget.fileId ? null : cur))}
        />
      )}
    </div>
  )
}
