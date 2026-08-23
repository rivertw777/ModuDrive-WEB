import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useDirectoryListing } from '../api/list-directory'
import { useFileUpload } from '../hooks/use-file-upload'
import type { FileEntry } from '../types'
import { Toolbar } from './toolbar'
import { FileList } from './file-list'
import { UploadDropzone } from './upload-dropzone'
import { NewFolderDialog } from './new-folder-dialog'
import { FileDetailPanel } from './file-detail-panel'
import { UploadConflictDialog } from './upload-conflict-dialog'

export function DriveExplorer({ path }: { path: string }) {
  const navigate = useNavigate()
  const { data: files, isLoading, isError } = useDirectoryListing(path)
  const { onFilesSelected, uploadingLabel, uploadError, conflictName, resolveConflict } =
    useFileUpload(path)

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  const onNavigate = (nextPath: string) => {
    setSelectedFileId(null)
    navigate(`/drive${nextPath === '/' ? '' : nextPath}`)
  }

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 p-6">
        <Toolbar
          path={path}
          onNewFolder={() => setNewFolderOpen(true)}
          onFilesSelected={onFilesSelected}
          uploadingLabel={uploadingLabel}
        />

        {uploadError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
        )}

        <div className="mt-4">
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="폴더를 불러오지 못했습니다" />}
          {files && (
            <UploadDropzone onFilesSelected={onFilesSelected}>
              <FileList
                files={files}
                selectedFileId={selectedFileId}
                onNavigate={onNavigate}
                onSelect={onSelect}
                onFileDeleted={(fileId) =>
                  setSelectedFileId((cur) => (cur === fileId ? null : cur))
                }
                onClearSelection={() => setSelectedFileId(null)}
              />
            </UploadDropzone>
          )}
        </div>
      </div>

      {selectedFileId && (
        <FileDetailPanel fileId={selectedFileId} onClose={() => setSelectedFileId(null)} />
      )}

      <NewFolderDialog open={newFolderOpen} onClose={() => setNewFolderOpen(false)} path={path} />

      <UploadConflictDialog name={conflictName} onResolve={resolveConflict} />
    </div>
  )
}
