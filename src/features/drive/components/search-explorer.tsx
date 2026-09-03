import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { SearchIcon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
import { useSearchFiles } from '../api/search-files'
import type { FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'
import { ViewToggle } from './view-toggle'

export function SearchExplorer() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const { data: files, isLoading, isError } = useSearchFiles(query)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const onNavigate = (path: string) => {
    setSelectedFileId(null)
    navigate(`/drive${path === '/' ? '' : path}`)
  }

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <PageHeader title={`‘${query}’ 검색 결과`}>
          <ViewToggle />
        </PageHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="검색에 실패했습니다" />}
          {files && (
            <FileList
              files={files}
              selectedFileId={selectedFileId}
              onNavigate={onNavigate}
              onSelect={onSelect}
              onFileDeleted={(fileId) => setSelectedFileId((cur) => (cur === fileId ? null : cur))}
              onClearSelection={() => setSelectedFileId(null)}
              emptyLabel="검색 결과가 없습니다"
              emptyIcon={SearchIcon}
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
