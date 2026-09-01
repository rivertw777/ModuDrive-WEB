import { Button } from '@/components/ui/button'
import { FolderPlusIcon } from '@/components/ui/icons'
import { Breadcrumb } from './breadcrumb'
import { UploadButton } from './upload-button'
import { ViewToggle } from './view-toggle'

export function Toolbar({
  path,
  onNewFolder,
  onFilesSelected,
}: {
  path: string
  onNewFolder: () => void
  onFilesSelected: (files: File[]) => void
}) {
  return (
    <div className="flex items-center justify-between pb-4">
      <Breadcrumb path={path} />
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onNewFolder}>
          <FolderPlusIcon size={16} />
          새 폴더
        </Button>
        <UploadButton onFilesSelected={onFilesSelected} />
        <ViewToggle />
      </div>
    </div>
  )
}
