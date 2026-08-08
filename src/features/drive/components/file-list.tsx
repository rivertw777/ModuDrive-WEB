import { useState } from 'react'
import { EmptyState } from '@/components/ui/state'
import { ContextMenu, ContextMenuItem, type ContextMenuPosition } from '@/components/ui/context-menu'
import {
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  ImageIcon,
  MoveIcon,
  PencilIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
} from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { formatFileSize, isImageFile, joinPath, sortEntries, type FileEntry, type SortDirection } from '../types'
import { downloadFile } from '../api/download-file'
import { useToggleFavorite } from '../api/toggle-favorite'
import { RenameDialog } from './rename-dialog'
import { MoveDialog } from './move-dialog'
import { ShareDialog } from './share-dialog'
import { DeleteConfirmDialog } from './delete-confirm-dialog'

function EntryIcon({ file }: { file: FileEntry }) {
  if (file.directory) return <FolderIcon size={20} className="shrink-0 text-violet-500" />
  if (isImageFile(file.name)) return <ImageIcon size={20} className="shrink-0 text-emerald-500" />
  return <FileIcon size={20} className="shrink-0 text-slate-400 dark:text-neutral-500" />
}

type DialogState = { type: 'rename' | 'move' | 'share' | 'delete'; file: FileEntry }

export function FileList({
  files,
  selectedFileId,
  onNavigate,
  onSelect,
  onFileDeleted,
  navigable = true,
  emptyLabel = '이 폴더는 비어 있습니다',
}: {
  files: FileEntry[]
  selectedFileId: string | null
  onNavigate: (path: string) => void
  onSelect: (file: FileEntry) => void
  onFileDeleted?: (fileId: string) => void
  navigable?: boolean
  emptyLabel?: string
}) {
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [menu, setMenu] = useState<(ContextMenuPosition & { file: FileEntry }) | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const toggleFavorite = useToggleFavorite()

  const visible = sortEntries(
    files.filter((file) => file.status !== 'DELETED'),
    sortDir,
  )

  if (visible.length === 0) {
    return <EmptyState label={emptyLabel} />
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
            <th className="py-2 font-medium">
              <button
                type="button"
                onClick={() => setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))}
                className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-neutral-200"
              >
                이름
                {sortDir && (
                  <ChevronRightIcon
                    size={14}
                    className={sortDir === 'asc' ? '-rotate-90' : 'rotate-90'}
                  />
                )}
              </button>
            </th>
            <th className="w-28 py-2 text-right font-medium">크기</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((file) => (
            <tr
              key={file.fileId}
              onClick={() => (file.directory && navigable ? onNavigate(joinPath(file.path, file.name)) : onSelect(file))}
              onContextMenu={(event) => {
                event.preventDefault()
                setMenu({ file, x: event.clientX, y: event.clientY })
              }}
              className={cn(
                'cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-neutral-900 dark:hover:bg-neutral-900',
                selectedFileId === file.fileId && 'bg-violet-50 hover:bg-violet-50 dark:bg-violet-950 dark:hover:bg-violet-950',
              )}
            >
              <td className="py-2.5">
                <span className="flex items-center gap-2.5 text-slate-800 dark:text-neutral-200">
                  <EntryIcon file={file} />
                  {file.name}
                  {file.favorite && (
                    <StarIcon size={14} className="shrink-0 fill-amber-400 text-amber-400" />
                  )}
                </span>
              </td>
              <td className="py-2.5 text-right text-slate-500 dark:text-neutral-400">
                {file.directory ? '-' : formatFileSize(file.fileSize)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {menu && (
        <ContextMenu position={menu} onClose={() => setMenu(null)}>
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
              setDialog({ type: 'rename', file: menu.file })
              setMenu(null)
            }}
          >
            <PencilIcon size={16} /> 이름 바꾸기
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              setDialog({ type: 'move', file: menu.file })
              setMenu(null)
            }}
          >
            <MoveIcon size={16} /> 이동
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              setDialog({ type: 'share', file: menu.file })
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
              setDialog({ type: 'delete', file: menu.file })
              setMenu(null)
            }}
          >
            <TrashIcon size={16} /> 휴지통으로 이동
          </ContextMenuItem>
        </ContextMenu>
      )}

      {dialog?.type === 'rename' && (
        <RenameDialog
          open
          onClose={() => setDialog(null)}
          fileId={dialog.file.fileId}
          currentName={dialog.file.name}
        />
      )}
      {dialog?.type === 'move' && (
        <MoveDialog open onClose={() => setDialog(null)} fileId={dialog.file.fileId} currentPath={dialog.file.path} />
      )}
      {dialog?.type === 'share' && (
        <ShareDialog open onClose={() => setDialog(null)} fileId={dialog.file.fileId} />
      )}
      {dialog?.type === 'delete' && (
        <DeleteConfirmDialog
          open
          onClose={() => setDialog(null)}
          fileId={dialog.file.fileId}
          fileName={dialog.file.name}
          onDeleted={() => onFileDeleted?.(dialog.file.fileId)}
        />
      )}
    </>
  )
}
