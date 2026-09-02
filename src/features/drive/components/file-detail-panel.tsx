import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useResizableWidth, ResizeHandle } from '@/components/ui/use-resizable-width'
import {
  DownloadIcon,
  FileIcon,
  FolderIcon,
  MoveIcon,
  PencilIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
  XIcon,
} from '@/components/ui/icons'
import { formatDate, formatFileSize } from '../types'
import { useFile } from '../api/get-file'
import { downloadFile } from '../api/download-file'
import { useToggleFavorite } from '../api/toggle-favorite'
import { ShareModal } from './share-modal'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { RenameDialog } from './rename-dialog'
import { MoveDialog } from './move-dialog'

export function FileDetailPanel({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const { data: file, isLoading, isError } = useFile(fileId)
  const toggleFavorite = useToggleFavorite()
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
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

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="파일 정보를 불러오지 못했습니다" />}

      {file && (
        <div className="mt-4 space-y-5 text-sm">
          <div className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 py-6 dark:bg-slate-800">
            {file.directory ? (
              <FolderIcon size={36} className="text-brand-500" />
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
              <dd className="text-slate-700 dark:text-slate-300">
                {formatFileSize(file.fileSize)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>수정 날짜</dt>
              <dd className="text-slate-700 dark:text-slate-300">{formatDate(file.updatedAt)}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2 pt-1">
            {file.status === 'UPLOADED' && !file.directory && (
              <Button variant="secondary" onClick={() => downloadFile(file.fileId, file.name)}>
                <DownloadIcon size={16} />
                다운로드
              </Button>
            )}
            <Button variant="secondary" onClick={() => setRenameOpen(true)}>
              <PencilIcon size={16} />
              이름 바꾸기
            </Button>
            <Button variant="secondary" onClick={() => setMoveOpen(true)}>
              <MoveIcon size={16} />
              이동
            </Button>
            <Button variant="secondary" onClick={() => setShareOpen(true)}>
              <ShareIcon size={16} />
              공유
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toggleFavorite.mutate({ fileId: file.fileId, favorite: !file.favorite })
              }
              disabled={toggleFavorite.isPending}
            >
              <StarIcon
                size={16}
                className={file.favorite ? 'fill-amber-400 text-amber-400' : undefined}
              />
              {file.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <TrashIcon size={16} />
              휴지통으로 이동
            </Button>
          </div>
        </div>
      )}

      {file && (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          fileId={fileId}
          fileName={file.name}
        />
      )}
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        files={file ? [{ fileId, name: file.name }] : []}
        onDeleted={onClose}
      />
      {file && (
        <>
          <RenameDialog
            open={renameOpen}
            onClose={() => setRenameOpen(false)}
            fileId={fileId}
            currentName={file.name}
          />
          <MoveDialog open={moveOpen} onClose={() => setMoveOpen(false)} files={[file]} />
        </>
      )}

      <ResizeHandle edge="left" onMouseDown={panel.onMouseDown} />
    </aside>
  )
}
