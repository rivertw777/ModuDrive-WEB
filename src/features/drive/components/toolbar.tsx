import { Button } from '@/components/ui/button'
import { FolderPlusIcon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
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
    <PageHeader title={<Breadcrumb path={path} />}>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onNewFolder}>
          <FolderPlusIcon size={16} />
          새 폴더
        </Button>
        <UploadButton onFilesSelected={onFilesSelected} />
        <ViewToggle />
      </div>
    </PageHeader>
  )
}
