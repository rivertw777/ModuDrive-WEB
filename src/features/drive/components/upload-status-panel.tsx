import { useState } from 'react'
import { AlertCircleIcon, CheckIcon, ChevronRightIcon, LoaderIcon, XIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import type { UploadItem } from '../hooks/use-file-upload'
import { EntryIcon } from './entry-icon'

export function UploadStatusPanel({
  uploads,
  onDismiss,
}: {
  uploads: UploadItem[]
  onDismiss: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  if (uploads.length === 0) return null

  const uploadingCount = uploads.filter((item) => item.status === 'uploading').length
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
              <EntryIcon name={item.name} size={20} />
              <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">
                {item.name}
              </span>
              {item.status === 'uploading' && (
                <>
                  <span className="shrink-0 text-sm text-slate-400 dark:text-slate-500">
                    {item.percent}%
                  </span>
                  <LoaderIcon size={16} className="shrink-0 animate-spin text-slate-400" />
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
