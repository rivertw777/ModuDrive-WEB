import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { FolderIcon } from '@/components/ui/icons'
import { useDirectoryListing } from '../api/list-directory'
import { useFileUpload } from '../hooks/use-file-upload'
import type { FileEntry, SortDir, SortField } from '../types'
import { Toolbar } from './toolbar'
import { FileList } from './file-list'
import { UploadDropzone } from './upload-dropzone'
import { NewFolderDialog } from './new-folder-dialog'
import { FileDetailPanel } from './file-detail-panel'
import { UploadConflictDialog } from './upload-conflict-dialog'
import { UploadStatusPanel } from './upload-status-panel'

export function DriveExplorer({ path }: { path: string }) {
  const navigate = useNavigate()
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'name', dir: 'asc' })
  const query = useDirectoryListing(path, sort.field, sort.dir)
  const { onFilesSelected, uploads, clearUploads, uploadError, conflictName, resolveConflict } =
    useFileUpload(path)

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  const files = query.data?.pages.flatMap((page) => page.content) ?? []

  const onSortChange = (field: SortField) =>
    setSort((current) =>
      current.field === field
        ? { field, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' },
    )

  const onNavigate = (nextPath: string) => {
    setSelectedFileId(null)
    navigate(`/drive${nextPath === '/' ? '' : nextPath}`)
  }

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <div className="shrink-0">
          <Toolbar
            path={path}
            onNewFolder={() => setNewFolderOpen(true)}
            onFilesSelected={onFilesSelected}
          />

          {uploadError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
          )}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {query.isLoading && <LoadingState />}
          {query.isError && <ErrorState message="폴더를 불러오지 못했습니다" />}
          {query.data && (
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
                emptyLabel="저장된 파일이 없습니다"
                emptyIcon={FolderIcon}
                serverPagination={{
                  hasMore: query.hasNextPage,
                  isLoadingMore: query.isFetchingNextPage,
                  onLoadMore: () => {
                    void query.fetchNextPage()
                  },
                  sortField: sort.field,
                  sortDir: sort.dir,
                  onSortChange,
                }}
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

      <UploadStatusPanel uploads={uploads} onDismiss={clearUploads} />
    </div>
  )
}
