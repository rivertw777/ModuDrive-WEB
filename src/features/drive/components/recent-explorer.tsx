import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { ClockIcon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
import { useRecentFiles } from '../api/list-recent-files'
import type { FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'
import { ViewToggle } from './view-toggle'

export function RecentExplorer() {
  const navigate = useNavigate()
  const { data: files, isLoading, isError } = useRecentFiles()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const onNavigate = (path: string) => {
    setSelectedFileId(null)
    navigate(`/drive${path === '/' ? '' : path}`)
  }

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <PageHeader title="최근 문서함">
          <ViewToggle />
        </PageHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="최근 문서를 불러오지 못했습니다" />}
          {files && (
            <FileList
              files={files}
              selectedFileId={selectedFileId}
              onNavigate={onNavigate}
              onSelect={onSelect}
              onFileDeleted={(fileId) => setSelectedFileId((cur) => (cur === fileId ? null : cur))}
              onClearSelection={() => setSelectedFileId(null)}
              showLocation
              preserveOrder
              dateColumn={{ label: '접근한 날짜', getValue: (file) => file.accessedAt }}
              emptyLabel="최근에 연 파일이 없습니다"
              emptyIcon={ClockIcon}
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
