import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { DownloadIcon, FileIcon, FolderIcon } from '@/components/ui/icons'
import { usePublicFile } from '../api/get-public-file'
import { downloadPublicFile } from '../api/download-public-file'
import { canPreviewFile } from '../types'
import { EntryIcon } from './entry-icon'
import { FilePreview } from './file-preview'
import { PublicFolderView } from './public-folder-view'
import { VIEWER_BACKDROP } from './file-viewer-modal'

// Deliberately its own tree, not reused with ShareModal's authenticated
// components — different auth boundary, so no accidental leak of admin UI
// to an anonymous visitor.
//
// Same dark full-screen viewer chrome as FileViewerModal (icon + name left,
// action buttons right), minus the share button — an anonymous link visitor
// has nothing to share from — and minus the close button: there's no app
// underneath to return to, this page *is* the destination.
export function PublicFileView({ token }: { token: string }) {
  const { data: file, isLoading, isError } = usePublicFile(token)
  const canPreview = !!file && !file.directory && canPreviewFile(file.name, file.fileSize)

  // A folder link opens a browser for its contents, not a single-file viewer.
  if (file?.directory) {
    return <PublicFolderView token={token} rootName={file.name} />
  }

  return (
    <div className={`flex h-dvh flex-col ${VIEWER_BACKDROP}`}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-8 py-3 text-slate-100 shadow-sm backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          {file ? (
            <EntryIcon name={file.name} directory={file.directory} size={26} />
          ) : (
            <FileIcon size={26} className="shrink-0 text-slate-400" />
          )}
          <p className="min-w-0 truncate text-sm font-medium">{file?.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {file && !file.directory && (
            <button
              type="button"
              onClick={() => downloadPublicFile(token, file.name)}
              aria-label="다운로드"
              className="inline-flex size-9 items-center justify-center rounded-full hover:bg-white/10"
            >
              <DownloadIcon size={18} />
            </button>
          )}
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-full bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"
          >
            로그인
          </Link>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-6">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="파일을 찾을 수 없습니다" />}
        {file && canPreview && (
          <FilePreview
            fileName={file.name}
            fileSize={file.fileSize}
            source={{ type: 'public', token }}
            fullscreen
          />
        )}
        {file && !canPreview && (
          <div className="flex flex-col items-center gap-3 text-slate-300">
            {file.directory ? <FolderIcon size={56} /> : <FileIcon size={56} />}
            <p className="text-sm">미리보기를 지원하지 않는 파일입니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
