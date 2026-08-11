import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { LoaderIcon, UploadIcon } from '@/components/ui/icons'

export function UploadButton({
  onFilesSelected,
  uploadingLabel,
}: {
  onFilesSelected: (files: File[]) => void
  uploadingLabel: string | null
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {uploadingLabel && (
        <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <LoaderIcon size={14} className="animate-spin" />
          {uploadingLabel}
        </span>
      )}
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
    </>
  )
}
