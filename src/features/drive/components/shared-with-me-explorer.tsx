import { useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useSharedWithMe } from '../api/list-shared-with-me'
import type { FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'

export function SharedWithMeExplorer() {
  const { data: files, isLoading, isError } = useSharedWithMe()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 p-6">
        <h1 className="pb-4 text-lg font-medium text-slate-900 dark:text-slate-100">공유 문서함</h1>

        {isLoading && <LoadingState />}
        {isError && <ErrorState message="공유받은 파일을 불러오지 못했습니다" />}
        {files && (
          <FileList
            files={files}
            selectedFileId={selectedFileId}
            onNavigate={() => {}}
            onSelect={onSelect}
            onFileDeleted={(fileId) => setSelectedFileId((cur) => (cur === fileId ? null : cur))}
            onClearSelection={() => setSelectedFileId(null)}
            navigable={false}
            emptyLabel="아직 공유받은 파일이 없습니다"
          />
        )}
      </div>

      {selectedFileId && (
        <FileDetailPanel fileId={selectedFileId} onClose={() => setSelectedFileId(null)} />
      )}
    </div>
  )
}
