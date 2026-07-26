import { useState, type DragEvent, type ReactNode } from 'react'

export function UploadDropzone({
  onFilesSelected,
  children,
}: {
  onFilesSelected: (files: File[]) => void
  children: ReactNode
}) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onFilesSelected(files)
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`rounded-md border-2 border-dashed transition-colors ${
        isDragging ? 'border-slate-400 bg-slate-50' : 'border-transparent'
      }`}
    >
      {children}
    </div>
  )
}
