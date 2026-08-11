import { useStorageUsage } from '../api/get-storage-usage'
import { formatFileSize } from '../types'

export function StorageUsage() {
  const { data } = useStorageUsage()
  if (!data) return null

  const percent = Math.min(100, (data.usedBytes / data.quotaBytes) * 100)
  const remainingPercent = Math.max(0, Math.round(100 - percent))

  return (
    <div className="px-2 py-4 text-sm">
      <div className="flex items-baseline justify-between">
        <span>
          <span className="font-semibold text-violet-600 dark:text-violet-400">
            {formatFileSize(data.usedBytes)}
          </span>
          <span className="text-slate-400 dark:text-slate-500"> / {formatFileSize(data.quotaBytes)}</span>
        </span>
        <span className="text-slate-400 dark:text-slate-500">{remainingPercent}% 남음</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full rounded-full bg-violet-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
