import { useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useFilesByCategory } from '../api/list-files-by-category'
import { FILE_CATEGORIES, type FileCategory, type FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'

export function CategoryExplorer({ category }: { category: FileCategory }) {
  const label = FILE_CATEGORIES.find((c) => c.type === category)?.label ?? category
  const { data: files, isLoading, isError } = useFilesByCategory(category)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 p-6">
        <h1 className="pb-4 text-lg font-medium text-slate-900 dark:text-slate-100">{label}</h1>

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
