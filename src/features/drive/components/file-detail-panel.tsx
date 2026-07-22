import { useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useFile } from '../api/get-file'
import { useFileRevisions } from '../api/get-file-revisions'
import { downloadFile } from '../api/download-file'
import { ShareDialog } from './share-dialog'
import { DeleteConfirmDialog } from './delete-confirm-dialog'

const STATUS_LABEL: Record<string, string> = {
  PENDING: '업로드 중',
  UPLOADED: '업로드 완료',
  DELETED: '삭제됨',
}

export function FileDetailPanel({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const { data: file, isLoading, isError } = useFile(fileId)
  const { data: revisions } = useFileRevisions(fileId)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <aside className="w-72 shrink-0 border-l border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">파일 정보</h2>
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-700">
          닫기
        </button>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="파일 정보를 불러오지 못했습니다" />}

      {file && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="font-medium text-slate-900">{file.name}</p>
            <dl className="mt-2 space-y-1 text-slate-500">
              <div className="flex justify-between">
                <dt>크기</dt>
                <dd>{file.fileSize ?? '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt>상태</dt>
                <dd>{STATUS_LABEL[file.status] ?? file.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt>소유자</dt>
                <dd className="truncate" title={file.ownerId}>
                  {file.ownerId}
                </dd>
              </div>
            </dl>
          </div>

          {revisions && revisions.length > 0 && (
            <div>
              <p className="font-medium text-slate-900">버전 기록</p>
              <ul className="mt-2 space-y-1 text-slate-500">
                {revisions.map((revision) => (
                  <li key={revision.versionId} className="flex justify-between">
                    <span>{revision.versionId.slice(0, 8)}</span>
                    <span>{revision.fileSize} bytes</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {file.status === 'UPLOADED' && !file.directory && (
              <button
                onClick={() => downloadFile(file.fileId, file.name)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                다운로드
              </button>
            )}
            <button
              onClick={() => setShareOpen(true)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              공유
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
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
    </aside>
  )
}
