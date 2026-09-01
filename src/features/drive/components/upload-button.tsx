import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { UploadIcon } from '@/components/ui/icons'

export function UploadButton({
  onFilesSelected,
}: {
  onFilesSelected: (files: File[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
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
