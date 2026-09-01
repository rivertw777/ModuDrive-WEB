import { useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { DocumentIcon, FileIcon, ImageIcon, MusicIcon, VideoIcon } from '@/components/ui/icons'
import { useFilesByCategory } from '../api/list-files-by-category'
import { useFileUpload } from '../hooks/use-file-upload'
import { FILE_CATEGORIES, type FileCategory, type FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'
import { UploadButton } from './upload-button'
import { UploadConflictDialog } from './upload-conflict-dialog'
import { UploadStatusPanel } from './upload-status-panel'
import { ViewToggle } from './view-toggle'

// Mirrors app-layout.tsx's sidebar CATEGORY_ICONS so the empty state matches the nav icon clicked.
const CATEGORY_ICONS = {
  IMAGE: ImageIcon,
  VIDEO: VideoIcon,
  DOCUMENT: DocumentIcon,
  AUDIO: MusicIcon,
  OTHER: FileIcon,
} as const

export function CategoryExplorer({ category }: { category: FileCategory }) {
  const label = FILE_CATEGORIES.find((c) => c.type === category)?.label ?? category
  const { data: files, isLoading, isError } = useFilesByCategory(category)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  // Category views span every folder, so uploads here land in the drive root.
  const { onFilesSelected, uploads, clearUploads, uploadError, conflictName, resolveConflict } =
    useFileUpload('/')

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 p-6">
        <div className="flex items-center justify-between pb-4">
          <h1 className="text-lg font-medium text-slate-900 dark:text-slate-100">{label}</h1>
          <div className="flex items-center gap-2">
            <UploadButton onFilesSelected={onFilesSelected} />
            <ViewToggle />
          </div>
        </div>

        {uploadError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{uploadError}</p>}

        {isLoading && <LoadingState />}
        {isError && <ErrorState message={`${label} 목록을 불러오지 못했습니다`} />}
        {files && (
          <FileList
            files={files}
            selectedFileId={selectedFileId}
            onNavigate={() => {}}
            onSelect={onSelect}
            navigable={false}
            emptyLabel={`${label} 파일이 없습니다`}
            emptyIcon={CATEGORY_ICONS[category]}
          />
        )}
      </div>

      {selectedFileId && (
        <FileDetailPanel fileId={selectedFileId} onClose={() => setSelectedFileId(null)} />
      )}

      <UploadConflictDialog name={conflictName} onResolve={resolveConflict} />

      <UploadStatusPanel uploads={uploads} onDismiss={clearUploads} />
    </div>
  )
}
