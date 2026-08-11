import { useState, type DragEvent, type ReactNode } from 'react'
import { UploadIcon } from '@/components/ui/icons'

export function UploadDropzone({
  onFilesSelected,
  children,
}: {
  onFilesSelected: (files: File[]) => void
  children: ReactNode
}) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onFilesSelected(files)
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
      className="relative rounded-lg"
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-violet-400 bg-violet-50/90 text-violet-700 dark:bg-violet-950/90 dark:text-violet-300">
          <UploadIcon size={28} />
          <p className="text-sm font-medium">여기에 파일을 놓아 업로드</p>
        </div>
      )}
      {children}
    </div>
  )
}
