import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { runBatch } from '@/utils/run-batch'
import { useMoveFile } from '../api/move-file'
import { DRAG_MIME } from '../types'

export function Breadcrumb({ path }: { path: string }) {
  const segments = path.split('/').filter(Boolean)
  const moveFile = useMoveFile()
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Every breadcrumb segment except the current folder (rendered as plain text, not a Link
  // below) is a strict ancestor of whatever is being dragged out of the current listing — so
  // unlike file-list's in-folder drop, there's no self/descendant case to guard against here.
  const onDrop = async (event: React.DragEvent, targetPath: string) => {
    event.preventDefault()
    setDragOverPath(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(event.dataTransfer.getData(DRAG_MIME))
    } catch {
      return
    }
    if (!Array.isArray(parsed)) return
    const ids = parsed.filter((id): id is string => typeof id === 'string')
    if (ids.length === 0) return

    setError(null)
    const failed = await runBatch(ids, (fileId) => moveFile.mutateAsync({ fileId, path: targetPath }))
    if (failed.length > 0) setError(`${failed.length}개 항목을 이동하지 못했습니다`)
  }

  const dropHandlers = (targetPath: string) => ({
    onDragOver: (event: React.DragEvent) => {
      if (!event.dataTransfer.types.includes(DRAG_MIME)) return
      event.preventDefault()
      setDragOverPath(targetPath)
    },
    onDragLeave: () => setDragOverPath((cur) => (cur === targetPath ? null : cur)),
    onDrop: (event: React.DragEvent) => onDrop(event, targetPath),
  })

  return (
    <div>
      <nav className="-ml-1.5 flex items-center gap-1 text-lg">
        <Link
          to="/drive"
          // Already at root: dropping here would move items into the folder they're already in.
          {...(path !== '/' ? dropHandlers('/') : {})}
          className={cn(
            'rounded-md px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
            path !== '/' && dragOverPath === '/' && 'ring-2 ring-inset ring-brand-400',
          )}
        >
          내 드라이브
        </Link>
        {segments.map((segment, index) => {
          const href = `/drive/${segments.slice(0, index + 1).join('/')}`
          const targetPath = `/${segments.slice(0, index + 1).join('/')}`
          const isLast = index === segments.length - 1
          return (
            <span key={href} className="flex items-center gap-1">
              <ChevronRightIcon size={16} className="text-slate-400 dark:text-slate-600" />
              {isLast ? (
                <span className="rounded-md px-1.5 py-0.5 font-medium text-slate-700 dark:text-slate-300">
                  {segment}
                </span>
              ) : (
                <Link
                  to={href}
                  {...dropHandlers(targetPath)}
                  className={cn(
                    'rounded-md px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
                    dragOverPath === targetPath && 'ring-2 ring-inset ring-brand-400',
                  )}
                >
                  {segment}
                </Link>
              )}
            </span>
          )
        })}
      </nav>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
