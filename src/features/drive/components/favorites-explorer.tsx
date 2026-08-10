import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useFavorites } from '../api/list-favorites'
import type { FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'

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
      <div className="min-w-0 flex-1 p-6">
        <h1 className="pb-4 text-lg font-medium text-slate-900 dark:text-slate-100">즐겨찾기</h1>

        {isLoading && <LoadingState />}
        {isError && <ErrorState message="즐겨찾기를 불러오지 못했습니다" />}
        {files && (
          <FileList
            files={files}
            selectedFileId={selectedFileId}
            onNavigate={onNavigate}
            onSelect={onSelect}
            onFileDeleted={(fileId) => setSelectedFileId((cur) => (cur === fileId ? null : cur))}
            showLocation
            emptyLabel="즐겨찾기한 파일이 없습니다"
          />
        )}
      </div>

      {selectedFileId && (
        <FileDetailPanel fileId={selectedFileId} onClose={() => setSelectedFileId(null)} />
      )}
    </div>
  )
}
