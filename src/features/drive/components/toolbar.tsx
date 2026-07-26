import { useRef } from 'react'
import { Breadcrumb } from './breadcrumb'

export function Toolbar({
  path,
  onNewFolder,
  onFilesSelected,
  uploadingLabel,
}: {
  path: string
  onNewFolder: () => void
  onFilesSelected: (files: File[]) => void
  uploadingLabel: string | null
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
      <Breadcrumb path={path} />
      <div className="flex items-center gap-2">
        {uploadingLabel && <span className="text-sm text-slate-500">{uploadingLabel}</span>}
        <button
          onClick={onNewFolder}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          새 폴더
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          업로드
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            if (files.length > 0) onFilesSelected(files)
            event.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
