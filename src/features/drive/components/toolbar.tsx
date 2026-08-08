import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { FolderPlusIcon, LoaderIcon, UploadIcon } from '@/components/ui/icons'
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
    <div className="flex items-center justify-between pb-4">
      <Breadcrumb path={path} />
      <div className="flex items-center gap-2">
        {uploadingLabel && (
          <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <LoaderIcon size={14} className="animate-spin" />
            {uploadingLabel}
          </span>
        )}
        <Button variant="secondary" onClick={onNewFolder}>
          <FolderPlusIcon size={16} />
          새 폴더
        </Button>
        <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
          <UploadIcon size={16} />
          업로드
        </Button>
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
