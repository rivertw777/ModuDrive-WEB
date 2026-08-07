import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useSearchFiles } from '../api/search-files'
import type { FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'

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
      <div className="min-w-0 flex-1 p-6">
        <h1 className="pb-4 text-lg font-medium text-slate-900 dark:text-neutral-100">
          &lsquo;{query}&rsquo; 검색 결과
        </h1>

        {isLoading && <LoadingState />}
        {isError && <ErrorState message="검색에 실패했습니다" />}
        {files && (
          <FileList
            files={files}
            selectedFileId={selectedFileId}
            onNavigate={onNavigate}
            onSelect={onSelect}
            onFileDeleted={(fileId) => setSelectedFileId((cur) => (cur === fileId ? null : cur))}
            emptyLabel="검색 결과가 없습니다"
          />
        )}
      </div>

      {selectedFileId && (
        <FileDetailPanel fileId={selectedFileId} onClose={() => setSelectedFileId(null)} />
      )}
    </div>
  )
}
