import { useMemo, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon, FolderIcon, FolderPlusIcon } from '@/components/ui/icons'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/state'
import { runBatch } from '@/utils/run-batch'
import { useMoveFile } from '../api/move-file'
import { useDirectoryListing } from '../api/list-directory'
import { formatDate, joinPath, type FileEntry } from '../types'
import { NewFolderDialog } from './new-folder-dialog'

type MovableEntry = Pick<FileEntry, 'fileId' | 'name' | 'path' | 'directory'>

export function MoveDialog({
  open,
  onClose,
  files,
}: {
  open: boolean
  onClose: () => void
  files: MovableEntry[]
}) {
  const moveFile = useMoveFile()
  const [browsePath, setBrowsePath] = useState(files[0]?.path ?? '/')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  const { data: entries, isLoading, isError } = useDirectoryListing(browsePath)

  // Folders being moved (and anything under them) can't be a valid destination —
  // filtering them out of each level's listing blocks drilling into that subtree at all.
  const sourceFolderPaths = useMemo(
    () =>
      files.filter((file) => file.directory).map((file) => joinPath(file.path, file.name)),
    [files],
  )
  const folders = (entries ?? []).filter(
    (entry) => entry.directory && !sourceFolderPaths.includes(joinPath(entry.path, entry.name)),
  )

  const reset = () => {
    setBrowsePath(files[0]?.path ?? '/')
    setError(null)
    setNewFolderOpen(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const onMove = async () => {
    setError(null)
    setIsSubmitting(true)
    const failed = await runBatch(files, (file) =>
      moveFile.mutateAsync({ fileId: file.fileId, path: browsePath }),
    )
    setIsSubmitting(false)

    if (failed.length > 0) {
      setError(`${failed.length}개 항목을 이동하지 못했습니다`)
      return
    }
    close()
  }

  const segments = browsePath.split('/').filter(Boolean)

  return (
    <Dialog
      open={open}
      onClose={close}
      title={files.length === 1 ? `"${files[0].name}" 이동` : `${files.length}개 항목 이동`}
      size="lg"
    >
      <div className="space-y-4">
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setBrowsePath('/')}
            className="rounded-md px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            내 드라이브
          </button>
          {segments.map((segment, index) => (
            <span key={index} className="flex items-center gap-1">
              <ChevronRightIcon size={14} className="text-slate-400 dark:text-slate-600" />
              <button
                type="button"
                onClick={() => setBrowsePath(`/${segments.slice(0, index + 1).join('/')}`)}
                className="rounded-md px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {segment}
              </button>
            </span>
          ))}
        </nav>

        <div className="h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="폴더를 불러오지 못했습니다" />}
          {!isLoading && !isError && folders.length === 0 && (
            <EmptyState label="하위 폴더가 없습니다" compact />
          )}
          {folders.map((folder) => (
            <button
              key={folder.fileId}
              type="button"
              onDoubleClick={() => setBrowsePath(joinPath(folder.path, folder.name))}
              onClick={() => setBrowsePath(joinPath(folder.path, folder.name))}
              className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              <FolderIcon size={18} className="shrink-0 text-violet-500" />
              <span className="flex-1 truncate">{folder.name}</span>
              <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                {formatDate(folder.updatedAt)}
              </span>
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          className="border border-white/20"
          onClick={() => setNewFolderOpen(true)}
        >
          <FolderPlusIcon size={16} /> 새 폴더
        </Button>

        <NewFolderDialog open={newFolderOpen} onClose={() => setNewFolderOpen(false)} path={browsePath} />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            취소
          </Button>
          <Button type="button" variant="primary" onClick={onMove} disabled={isSubmitting}>
            {isSubmitting ? '이동 중...' : '이동'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
