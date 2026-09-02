import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { ChevronRightIcon, DownloadIcon, FileIcon, FolderIcon } from '@/components/ui/icons'
import { usePublicChildren } from '../api/get-public-file'
import { downloadPublicFile } from '../api/download-public-file'
import { canPreviewFile, formatFileSize, type PublicFile } from '../types'
import { FilePreview } from './file-preview'
import { VIEWER_BACKDROP } from './file-viewer-modal'

type Crumb = { id: string; name: string }

/** Anonymous browser for a link-shared folder — its own tree, like PublicFileView, so no
 * authenticated UI leaks to a visitor. Navigates by entry id (the same value the download/view
 * routes take as `entryId`); the shared folder's own children need no id. */
export function PublicFolderView({ token, rootName }: { token: string; rootName: string }) {
  const [trail, setTrail] = useState<Crumb[]>([])
  const [preview, setPreview] = useState<PublicFile | null>(null)

  const currentId = trail[trail.length - 1]?.id
  const { data: entries, isLoading, isError } = usePublicChildren(token, currentId)

  const onOpen = (entry: PublicFile) => {
    if (entry.directory) {
      setPreview(null)
      setTrail((t) => [...t, { id: entry.fileId, name: entry.name }])
    } else {
      setPreview(entry)
    }
  }

  const goToDepth = (depth: number) => {
    setPreview(null)
    setTrail((t) => t.slice(0, depth))
  }

  return (
    <div className={`flex h-dvh flex-col ${VIEWER_BACKDROP}`}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-8 py-3 text-slate-100 shadow-sm backdrop-blur-xl">
        <nav className="flex min-w-0 items-center gap-1 text-sm">
          <FolderIcon size={22} className="mr-1 shrink-0 text-brand-400" />
          <button
            type="button"
            onClick={() => goToDepth(0)}
            className="max-w-[12rem] truncate rounded px-1.5 py-0.5 font-medium hover:bg-white/10"
          >
            {rootName}
          </button>
          {trail.map((crumb, index) => (
            <span key={crumb.id} className="flex min-w-0 items-center gap-1">
              <ChevronRightIcon size={14} className="shrink-0 text-white/40" />
              <button
                type="button"
                onClick={() => goToDepth(index + 1)}
                className="max-w-[12rem] truncate rounded px-1.5 py-0.5 font-medium hover:bg-white/10"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
        <Link
          to="/login"
          className="inline-flex h-9 shrink-0 items-center rounded-full bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"
        >
          로그인
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-full max-w-md shrink-0 overflow-y-auto border-r border-white/10 p-3">
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="폴더를 불러오지 못했습니다" />}
          {entries && entries.length === 0 && (
            <p className="p-4 text-sm text-slate-400">이 폴더는 비어 있습니다</p>
          )}
          {entries?.map((entry) => (
            <div
              key={entry.fileId}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10 ${
                preview?.fileId === entry.fileId ? 'bg-white/10' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                {entry.directory ? (
                  <FolderIcon size={18} className="shrink-0 text-brand-400" />
                ) : (
                  <FileIcon size={18} className="shrink-0 text-slate-400" />
                )}
                <span className="min-w-0 truncate">{entry.name}</span>
                {!entry.directory && (
                  <span className="ml-auto shrink-0 text-xs text-slate-500">
                    {formatFileSize(entry.fileSize)}
                  </span>
                )}
              </button>
              {!entry.directory && (
                <button
                  type="button"
                  onClick={() => downloadPublicFile(token, entry.name, entry.fileId)}
                  aria-label={`${entry.name} 다운로드`}
                  className="shrink-0 rounded-full p-1 text-slate-400 opacity-0 hover:bg-white/10 hover:text-slate-100 group-hover:opacity-100"
                >
                  <DownloadIcon size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          {!preview && <p className="text-sm text-slate-400">파일을 선택하세요</p>}
          {preview && canPreviewFile(preview.name, preview.fileSize) && (
            <FilePreview
              fileName={preview.name}
              fileSize={preview.fileSize}
              source={{ type: 'public', token, entryId: preview.fileId }}
              fullscreen
            />
          )}
          {preview && !canPreviewFile(preview.name, preview.fileSize) && (
            <div className="flex flex-col items-center gap-3 text-slate-300">
              <FileIcon size={56} />
              <p className="text-sm">미리보기를 지원하지 않는 파일입니다</p>
              <button
                type="button"
                onClick={() => downloadPublicFile(token, preview.name, preview.fileId)}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              >
                <DownloadIcon size={16} />
                다운로드
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
