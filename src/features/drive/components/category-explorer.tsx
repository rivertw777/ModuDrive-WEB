import { useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useFilesByCategory } from '../api/list-files-by-category'
import { useUploadFile } from '../api/upload-file'
import { FILE_CATEGORIES, type FileCategory, type FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'
import { UploadButton } from './upload-button'

export function CategoryExplorer({ category }: { category: FileCategory }) {
  const label = FILE_CATEGORIES.find((c) => c.type === category)?.label ?? category
  const { data: files, isLoading, isError } = useFilesByCategory(category)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const uploadFile = useUploadFile()
  const [uploadingLabel, setUploadingLabel] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  const onFilesSelected = async (selected: File[]) => {
    setUploadError(null)
    try {
      for (const file of selected) {
        setUploadingLabel(`${file.name} 0%`)
        // Category views span every folder, so uploads here land in the drive root.
        await uploadFile.mutateAsync({
          file,
          path: '/',
          onProgress: (percent) => setUploadingLabel(`${file.name} ${percent}%`),
        })
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '업로드에 실패했습니다')
    } finally {
      setUploadingLabel(null)
    }
  }

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 p-6">
        <div className="flex items-center justify-between pb-4">
          <h1 className="text-lg font-medium text-slate-900 dark:text-slate-100">{label}</h1>
          <div className="flex items-center gap-2">
            <UploadButton onFilesSelected={onFilesSelected} uploadingLabel={uploadingLabel} />
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
          />
        )}
      </div>

      {selectedFileId && (
        <FileDetailPanel fileId={selectedFileId} onClose={() => setSelectedFileId(null)} />
      )}
    </div>
  )
}
