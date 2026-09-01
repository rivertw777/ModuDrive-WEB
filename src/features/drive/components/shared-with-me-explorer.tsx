import { useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { UsersIcon } from '@/components/ui/icons'
import { useSharedWithMe } from '../api/list-shared-with-me'
import type { FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'
import { ViewToggle } from './view-toggle'

export function SharedWithMeExplorer() {
  const { data: files, isLoading, isError } = useSharedWithMe()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <div className="flex shrink-0 items-center justify-between pb-4">
          <h1 className="text-lg font-medium text-slate-900 dark:text-slate-100">공유 문서함</h1>
          <ViewToggle />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
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
              emptyIcon={UsersIcon}
            />
          )}
        </div>
      </div>

      {selectedFileId && (
        <FileDetailPanel fileId={selectedFileId} onClose={() => setSelectedFileId(null)} />
      )}
    </div>
  )
}
