import { Button } from '@/components/ui/button'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { DownloadIcon, FileIcon, FolderIcon } from '@/components/ui/icons'
import { usePublicFile } from '../api/get-public-file'
import { downloadPublicFile } from '../api/download-public-file'
import { formatDate, formatFileSize } from '../types'
import { FilePreview } from './file-preview'

// Deliberately its own tree, not reused with ShareModal's authenticated
// components — different auth boundary, so no accidental leak of admin UI
// to an anonymous visitor.
export function PublicFileView({ token }: { token: string }) {
  const { data: file, isLoading, isError } = usePublicFile(token)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="파일을 찾을 수 없습니다" />}

        {file && (
          <div className="flex flex-col items-center gap-4 text-center">
            {file.directory ? (
              <FolderIcon size={40} className="text-violet-500" />
            ) : (
              <FileIcon size={40} className="text-slate-400 dark:text-slate-500" />
            )}
            <p className="max-w-full truncate text-lg font-medium text-slate-900 dark:text-slate-100">
              {file.name}
            </p>
            {!file.directory && (
              <div className="w-full">
                <FilePreview
                  fileName={file.name}
                  fileSize={file.fileSize}
                  source={{ type: 'public', token }}
                />
              </div>
            )}
            <dl className="w-full space-y-2 text-sm text-slate-500 dark:text-slate-400">
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
            {/* Anonymous visitors get read + download only, never rename — so this is the one action here. */}
            {!file.directory && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => downloadPublicFile(token, file.name)}
              >
                <DownloadIcon size={16} />
                다운로드
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
