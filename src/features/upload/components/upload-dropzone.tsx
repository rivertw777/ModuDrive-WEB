import { useState, type DragEvent, type ReactNode } from 'react'
import { UploadIcon } from '@/components/ui/icons'
import { entriesFromDataTransfer, type UploadEntry } from '../utils/collect-upload-entries'

export function UploadDropzone({
  onUpload,
  onError,
  children,
}: {
  onUpload: (entries: UploadEntry[]) => void
  onError: (message: string) => void
  children: ReactNode
}) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    setIsDragging(false)
    // Read synchronously here — the browser empties dataTransfer once this handler returns.
    entriesFromDataTransfer(event.dataTransfer).then(
      (entries) => {
        if (entries.length > 0) onUpload(entries)
      },
      // e.g. a subfolder the OS won't let the browser read, or a file deleted mid-drag.
      () => onError('놓은 폴더를 읽지 못했습니다. 다시 시도해 주세요.'),
    )
  }

  return (
    <div
      onDragOver={(event) => {
        // Ignore in-list drags (moving files between folders) — only OS file drags upload.
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className="relative flex min-h-full flex-col rounded-lg"
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-400 bg-brand-50/90 text-brand-700 dark:bg-brand-950/90 dark:text-brand-300">
          <UploadIcon size={28} />
          <p className="text-sm font-medium">여기에 파일이나 폴더를 놓아 업로드</p>
        </div>
      )}
      {children}
    </div>
  )
}
