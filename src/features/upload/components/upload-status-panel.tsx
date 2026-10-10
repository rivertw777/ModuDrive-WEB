import { useState } from 'react'
import { AlertCircleIcon, CheckIcon, ChevronRightIcon, ClockIcon, LoaderIcon, XIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import type { UploadItem } from '../hooks/use-file-upload'
import { EntryIcon } from '@/components/file/entry-icon'

/** Bytes sent over bytes picked — a folder row sums every file under it. Before the first byte goes
 * out, the hashing that has to come first: "준비 중 37%". */
function progressOf(item: UploadItem) {
  const percent = (bytes: number) => (item.totalBytes > 0 ? Math.floor((bytes / item.totalBytes) * 100) : 0)
  return item.sentBytes === 0 && item.hashedBytes < item.totalBytes
    ? `준비 중 ${percent(item.hashedBytes)}%`
    : `${percent(item.sentBytes)}%`
}

export function UploadStatusPanel({
  uploads,
  onDismiss,
}: {
  uploads: UploadItem[]
  onDismiss: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  if (uploads.length === 0) return null

  const uploadingCount = uploads.filter((item) => item.status === 'uploading' || item.status === 'paused').length
  const doneCount = uploads.filter((item) => item.status === 'done').length
  const errorCount = uploads.filter((item) => item.status === 'error').length

  const headerText =
    uploadingCount > 0
      ? `항목 ${uploadingCount}개 업로드 중`
      : errorCount > 0
        ? `${doneCount}개 완료, ${errorCount}개 실패`
        : `${doneCount}개 항목 업로드 완료`

  return (
    <div className="fixed bottom-4 right-4 z-30 w-[26rem] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
        <span className="text-base font-medium text-slate-900 dark:text-slate-100">
          {headerText}
        </span>
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? '펼치기' : '접기'}
            className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <ChevronRightIcon
              size={18}
              className={cn('transition-transform', !collapsed && 'rotate-90')}
            />
          </button>
          <button
            onClick={onDismiss}
            aria-label="닫기"
            className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <ul className="max-h-64 overflow-y-auto">
          {uploads.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <EntryIcon name={item.name} directory={item.directory} size={20} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-slate-700 dark:text-slate-300">{item.name}</span>
                {item.status === 'paused' && (
                  <span className="block text-xs text-amber-600 dark:text-amber-400">
                    연결 대기 중 · 자동으로 다시 시도합니다
                  </span>
                )}
                {!item.directory && item.errorReason && (
                  <span className="block text-xs text-red-600 dark:text-red-400">
                    {item.errorReason}
                  </span>
                )}
                {item.directory && item.fileCount > 0 && (
                  <span className="block text-xs text-slate-400 dark:text-slate-500">
                    {item.doneCount}/{item.fileCount}개 파일
                    {item.errorCount > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        {' · '}
                        {item.errorCount}개 실패
                        {item.errorReason && ` (${item.errorReason})`}
                      </span>
                    )}
                  </span>
                )}
              </span>
              {item.status === 'uploading' && (
                <>
                  <span className="shrink-0 text-sm text-slate-400 dark:text-slate-500">
                    {progressOf(item)}
                  </span>
                  <LoaderIcon size={16} className="shrink-0 animate-spin text-slate-400" />
                </>
              )}
              {item.status === 'paused' && (
                <>
                  <span className="shrink-0 text-sm text-slate-400 dark:text-slate-500">
                    {progressOf(item)}
                  </span>
                  <ClockIcon size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                </>
              )}
              {item.status === 'done' && (
                <CheckIcon size={18} className="shrink-0 text-green-600 dark:text-green-400" />
              )}
              {item.status === 'error' && (
                <AlertCircleIcon size={18} className="shrink-0 text-red-600 dark:text-red-400" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
