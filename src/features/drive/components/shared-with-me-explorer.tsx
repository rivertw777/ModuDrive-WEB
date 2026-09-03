import { useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { ChevronRightIcon, UsersIcon } from '@/components/ui/icons'
import { useSharedWithMe } from '../api/list-shared-with-me'
import { useSharedDirectory } from '../api/list-shared-directory'
import { useFileDeeplink } from '../hooks/use-file-deeplink'
import { joinPath, type FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'
import { ViewToggle } from './view-toggle'

type Crumb = { fileId: string; name: string }

export function SharedWithMeExplorer() {
  // `?file=<id>` deep link — a notification or a "위치" link lands here with the file pre-selected.
  const { selectedFileId, setSelectedFileId, clearSelection } = useFileDeeplink()
  const [trail, setTrail] = useState<Crumb[]>([])

  const current: Crumb | null = trail[trail.length - 1] ?? null
  const root = useSharedWithMe()
  const nested = useSharedDirectory(current?.fileId ?? null)
  const { data: files, isLoading, isError } = current ? nested : root

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  // FileList navigates by full path; match it back to the rendered entry to get its id.
  const onNavigate = (targetPath: string) => {
    const entry = (files ?? []).find(
      (f) => f.directory && joinPath(f.path, f.name) === targetPath,
    )
    if (entry) {
      clearSelection()
      setTrail((t) => [...t, { fileId: entry.fileId, name: entry.name }])
    }
  }

  const goToDepth = (depth: number) => {
    clearSelection()
    setTrail((t) => t.slice(0, depth))
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <div className="flex shrink-0 items-center justify-between pb-4">
          <nav className="flex min-w-0 items-center gap-1 text-lg">
            <button
              type="button"
              onClick={() => goToDepth(0)}
              className="rounded-md px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              공유 문서함
            </button>
            {trail.map((crumb, index) => {
              const isLast = index === trail.length - 1
              return (
                <span key={crumb.fileId} className="flex min-w-0 items-center gap-1">
                  <ChevronRightIcon size={16} className="text-slate-400 dark:text-slate-600" />
                  {isLast ? (
                    <span className="truncate rounded-md px-1.5 py-0.5 font-medium text-slate-900 dark:text-slate-100">
                      {crumb.name}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => goToDepth(index + 1)}
                      className="truncate rounded-md px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {crumb.name}
                    </button>
                  )}
                </span>
              )
            })}
          </nav>
          <ViewToggle />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="공유받은 파일을 불러오지 못했습니다" />}
          {files && (
            <FileList
              files={files}
              selectedFileId={selectedFileId}
              onNavigate={onNavigate}
              onSelect={onSelect}
              onFileDeleted={(fileId) => setSelectedFileId((cur) => (cur === fileId ? null : cur))}
              onClearSelection={clearSelection}
              navigable
              showSharedBy={!current}
              emptyLabel={current ? '이 폴더는 비어 있습니다' : '아직 공유받은 파일이 없습니다'}
              emptyIcon={UsersIcon}
            />
          )}
        </div>
      </div>

      {selectedFileId && <FileDetailPanel fileId={selectedFileId} onClose={clearSelection} />}
    </div>
  )
}
