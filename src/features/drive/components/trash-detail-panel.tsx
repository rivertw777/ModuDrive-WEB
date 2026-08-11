import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useResizableWidth, ResizeHandle } from '@/components/ui/use-resizable-width'
import { FileIcon, FolderIcon, RestoreIcon, TrashIcon, XIcon } from '@/components/ui/icons'
import { formatDate, formatFileSize, type FileEntry } from '../types'
import { useRestoreFile } from '../api/restore-file'
import { PurgeConfirmDialog } from './purge-confirm-dialog'

export function TrashDetailPanel({ file, onClose }: { file: FileEntry; onClose: () => void }) {
  const restoreFile = useRestoreFile()
  const [purgeOpen, setPurgeOpen] = useState(false)
  const panel = useResizableWidth('modudrive.detailPanelWidth', 320, 240, 480, 'left')

  return (
    <aside
      style={{ width: panel.width }}
      className="relative shrink-0 border-l border-slate-200 p-4 dark:border-slate-700"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">파일 정보</h2>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="mt-4 space-y-5 text-sm">
        <div className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 py-6 dark:bg-slate-800">
          {file.directory ? (
            <FolderIcon size={36} className="text-violet-500" />
          ) : (
            <FileIcon size={36} className="text-slate-400 dark:text-slate-500" />
          )}
          <p className="max-w-full truncate px-4 text-center font-medium text-slate-900 dark:text-slate-100">
            {file.name}
          </p>
        </div>

        <dl className="space-y-2 text-slate-500 dark:text-slate-400">
          <div className="flex justify-between">
            <dt>크기</dt>
            <dd className="text-slate-700 dark:text-slate-300">{formatFileSize(file.fileSize)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>원래 위치</dt>
            <dd className="text-slate-700 dark:text-slate-300">{file.path}</dd>
          </div>
          <div className="flex justify-between">
            <dt>휴지통에 버린 날짜</dt>
            <dd className="text-slate-700 dark:text-slate-300">{formatDate(file.updatedAt)}</dd>
          </div>
        </dl>

        {restoreFile.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">{restoreFile.error.message}</p>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant="secondary"
            onClick={() => restoreFile.mutate(file.fileId, { onSuccess: onClose })}
            disabled={restoreFile.isPending}
          >
            <RestoreIcon size={16} />
            복원
          </Button>
          <Button variant="danger" onClick={() => setPurgeOpen(true)}>
            <TrashIcon size={16} />
            영구 삭제
          </Button>
        </div>
      </div>

      <PurgeConfirmDialog
        open={purgeOpen}
        onClose={() => setPurgeOpen(false)}
        onPurged={onClose}
        files={[{ fileId: file.fileId, name: file.name }]}
      />

      <ResizeHandle edge="left" onMouseDown={panel.onMouseDown} />
    </aside>
  )
}
