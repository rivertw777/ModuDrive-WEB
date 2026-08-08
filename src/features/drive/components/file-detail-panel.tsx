import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingState } from '@/components/ui/state'
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
import { formatFileSize } from '../types'
import { useFile } from '../api/get-file'
import { useFileRevisions } from '../api/get-file-revisions'
import { downloadFile } from '../api/download-file'
import { useToggleFavorite } from '../api/toggle-favorite'
import { ShareDialog } from './share-dialog'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { RenameDialog } from './rename-dialog'
import { MoveDialog } from './move-dialog'

const STATUS_LABEL: Record<string, string> = {
  PENDING: '업로드 중',
  UPLOADED: '업로드 완료',
  DELETED: '삭제됨',
}

const STATUS_CLASSES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  UPLOADED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  DELETED: 'bg-slate-200 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400',
}

export function FileDetailPanel({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const { data: file, isLoading, isError } = useFile(fileId)
  const { data: revisions } = useFileRevisions(fileId)
  const toggleFavorite = useToggleFavorite()
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)

  return (
    <aside className="w-80 shrink-0 border-l border-slate-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">파일 정보</h2>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <XIcon size={16} />
        </button>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="파일 정보를 불러오지 못했습니다" />}

      {file && (
        <div className="mt-4 space-y-5 text-sm">
          <div className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 py-6 dark:bg-neutral-900">
            {file.directory ? (
              <FolderIcon size={36} className="text-violet-500" />
            ) : (
              <FileIcon size={36} className="text-slate-400 dark:text-neutral-500" />
            )}
            <p className="max-w-full truncate px-4 text-center font-medium text-slate-900 dark:text-neutral-100">
              {file.name}
            </p>
          </div>

          <dl className="space-y-2 text-slate-500 dark:text-neutral-400">
            <div className="flex justify-between">
              <dt>크기</dt>
              <dd className="text-slate-700 dark:text-neutral-300">{formatFileSize(file.fileSize)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>상태</dt>
              <dd
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[file.status] ?? ''}`}
              >
                {STATUS_LABEL[file.status] ?? file.status}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="shrink-0">소유자</dt>
              <dd className="truncate text-slate-700 dark:text-neutral-300" title={file.ownerId}>
                {file.ownerId}
              </dd>
            </div>
          </dl>

          {revisions && revisions.length > 0 && (
            <div>
              <p className="font-medium text-slate-900 dark:text-neutral-100">버전 기록</p>
              <ul className="mt-2 space-y-1 text-slate-500 dark:text-neutral-400">
                {revisions.map((revision) => (
                  <li key={revision.versionId} className="flex justify-between">
                    <span>{revision.versionId.slice(0, 8)}</span>
                    <span>{formatFileSize(revision.fileSize)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {file.status === 'UPLOADED' && !file.directory && (
              <Button variant="secondary" onClick={() => downloadFile(file.fileId, file.name)}>
                <DownloadIcon size={16} />
                다운로드
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => toggleFavorite.mutate({ fileId: file.fileId, favorite: !file.favorite })}
              disabled={toggleFavorite.isPending}
            >
              <StarIcon size={16} className={file.favorite ? 'fill-amber-400 text-amber-400' : undefined} />
              {file.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            </Button>
            <Button variant="secondary" onClick={() => setRenameOpen(true)}>
              <PencilIcon size={16} />
              이름 변경
            </Button>
            <Button variant="secondary" onClick={() => setMoveOpen(true)}>
              <MoveIcon size={16} />
              이동
            </Button>
            <Button variant="secondary" onClick={() => setShareOpen(true)}>
              <ShareIcon size={16} />
              공유
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <TrashIcon size={16} />
              삭제
            </Button>
          </div>
        </div>
      )}

      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} fileId={fileId} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        fileId={fileId}
        fileName={file?.name ?? ''}
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
          <MoveDialog open={moveOpen} onClose={() => setMoveOpen(false)} fileId={fileId} currentPath={file.path} />
        </>
      )}
    </aside>
  )
}
