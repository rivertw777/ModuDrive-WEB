import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { StarIcon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
import { useFavorites } from '../api/list-favorites'
import type { FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'
import { ViewToggle } from './view-toggle'

export function FavoritesExplorer() {
  const navigate = useNavigate()
  const { data: files, isLoading, isError } = useFavorites()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const onNavigate = (path: string) => {
    setSelectedFileId(null)
    navigate(`/drive${path === '/' ? '' : path}`)
  }

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <PageHeader title="즐겨찾기">
          <ViewToggle />
        </PageHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="즐겨찾기를 불러오지 못했습니다" />}
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
              dateColumn={{ label: '즐겨찾기한 날짜', getValue: (file) => file.favoritedAt }}
              emptyLabel="즐겨찾기한 파일이 없습니다"
              emptyIcon={StarIcon}
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
