import { useEffect, useRef, useState } from 'react'
import { DownloadIcon, FileIcon, ImageIcon, ShareIcon, XIcon } from '@/components/ui/icons'
import { canPreviewFile, isImageFile } from '../types'
import { downloadFile } from '../api/download-file'
import { FilePreview } from './file-preview'
import { ShareModal } from './share-modal'

/** Google-Drive-style full-screen viewer, opened by double-clicking a file row (single click
 * still just selects). Dark overlay over the whole viewport, a header bar (file icon + name on
 * the left, share/download/close on the right) with file content centered below. Reuses
 * FilePreview's fetch/render and ShareModal — this component only adds the chrome and the
 * "can't preview this" fallback FilePreview itself stays silent on. */
export function FileViewerModal({
  open,
  onClose,
  fileId,
  fileName,
  fileSize,
}: {
  open: boolean
  onClose: () => void
  fileId: string
  fileName: string
  fileSize: number | null
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const canPreview = canPreviewFile(fileName, fileSize)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-0 h-dvh max-h-none w-dvw max-w-none overflow-visible bg-black/90 p-0 backdrop:bg-black/50"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-8 py-3 text-slate-100 shadow-sm backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-2">
            {isImageFile(fileName) ? (
              <ImageIcon size={26} className="shrink-0 text-emerald-400" />
            ) : (
              <FileIcon size={26} className="shrink-0 text-slate-400" />
            )}
            <p className="min-w-0 truncate text-sm font-medium">{fileName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => downloadFile(fileId, fileName)}
              aria-label="다운로드"
              className="inline-flex size-9 items-center justify-center rounded-full hover:bg-white/10"
            >
              <DownloadIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"
            >
              <ShareIcon size={16} />
              공유
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex size-9 items-center justify-center rounded-full hover:bg-white/10"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>
        <div
          className="flex flex-1 items-center justify-center overflow-auto p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          {canPreview ? (
            <FilePreview
              fileName={fileName}
              fileSize={fileSize}
              source={{ type: 'auth', fileId }}
              fullscreen
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-300">
              <FileIcon size={56} />
              <p className="text-sm">미리보기를 지원하지 않는 파일입니다</p>
            </div>
          )}
        </div>
      </div>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        fileId={fileId}
        fileName={fileName}
      />
    </dialog>
  )
}
