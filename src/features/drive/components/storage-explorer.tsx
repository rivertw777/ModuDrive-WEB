import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/stores/theme-store'
import { useWindowedList } from '@/hooks/use-windowed-list'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { SortHeader } from '@/components/ui/sort-header'
import { CloudIcon, DocumentIcon, FilesIcon, ImageIcon, MusicIcon, TrashIcon, VideoIcon } from '@/components/ui/icons'
import { useStorageUsage } from '../api/get-storage-usage'
import { useAllFiles } from '../api/list-all-files'
import { useTrash } from '../api/list-trash'
import { FILE_CATEGORIES, formatFileSize, locationLabel, type FileCategory, type FileEntry } from '../types'
import { EntryIcon } from './entry-icon'

// Tailwind palette hues — cohesive, CVD-safe adjacency, one light/dark pair each.
const CATEGORY_COLORS: Record<FileCategory, { light: string; dark: string }> = {
  IMAGE: { light: '#0ea5e9', dark: '#38bdf8' }, // sky
  DOCUMENT: { light: '#10b981', dark: '#34d399' }, // emerald
  VIDEO: { light: '#8b5cf6', dark: '#a78bfa' }, // violet
  AUDIO: { light: '#f59e0b', dark: '#fbbf24' }, // amber
  OTHER: { light: '#f43f5e', dark: '#fb7185' }, // rose
}
const CATEGORY_ICONS = { IMAGE: ImageIcon, VIDEO: VideoIcon, DOCUMENT: DocumentIcon, AUDIO: MusicIcon, OTHER: FilesIcon } as const

type SortField = 'name' | 'size'
type SortDir = 'asc' | 'desc'

export function StorageExplorer() {
  const navigate = useNavigate()
  const theme = useThemeStore((s) => s.theme)
  const { data: usage, isLoading: usageLoading, isError: usageError } = useStorageUsage()
  const { data: entries, isLoading: filesLoading, isError: filesError } = useAllFiles()
  // Trash is secondary data on this page — if the endpoint is down, still show the donut + table
  // (just without the trashed rows) rather than failing the whole screen.
  const { data: trashed, isLoading: trashLoading } = useTrash()
  const [sortField, setSortField] = useState<SortField>('size')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // /api/v1/files/all excludes folders and trashed files — that's the set the donut breaks down
  // by category. The table also lists trashed files (still counted against the quota), tagged
  // "휴지통".
  const dirSign = sortDir === 'asc' ? 1 : -1
  const sortEntries = (list: FileEntry[]) =>
    [...list].sort((a, b) =>
      sortField === 'name'
        ? dirSign * a.name.localeCompare(b.name)
        : dirSign * ((a.fileSize ?? 0) - (b.fileSize ?? 0)),
    )

  // Tag trashed rows from their source list — don't trust `status` to come back on /files/trash.
  const trashedFiles = (trashed ?? []).map((file): FileEntry => ({ ...file, status: 'DELETED' }))
  const files = sortEntries(entries ?? [])
  const tableFiles = sortEntries([...(entries ?? []), ...trashedFiles])
  // Table can hold every file the user owns — window it so only 100 rows paint at a time.
  const { visible: shownFiles, hasMore, sentinelRef } = useWindowedList(
    tableFiles,
    `${sortField}:${sortDir}`,
  )

  if (usageLoading || filesLoading || trashLoading) return <LoadingState />
  if (usageError || filesError || !usage || !entries) {
    return <ErrorState message="저장용량 정보를 불러오지 못했습니다" />
  }

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'name' ? 'asc' : 'desc')
    }
  }

  const isTrashed = (file: FileEntry) => file.status === 'DELETED'
  const locationText = (file: FileEntry) =>
    isTrashed(file) ? '휴지통' : locationLabel(file.path)
  const openLocation = (file: FileEntry) => {
    if (isTrashed(file)) {
      navigate(`/trash?file=${encodeURIComponent(file.fileId)}`)
    } else {
      navigate(`/drive${file.path === '/' ? '' : file.path}?file=${encodeURIComponent(file.fileId)}`)
    }
  }

  const categoryBytes: Record<FileCategory, number> = { IMAGE: 0, VIDEO: 0, DOCUMENT: 0, AUDIO: 0, OTHER: 0 }
  for (const file of files) {
    categoryBytes[file.category] += file.fileSize ?? 0
  }

  const legend = FILE_CATEGORIES.map((c) => ({
    type: c.type as string,
    label: c.label,
    icon: CATEGORY_ICONS[c.type],
    color: CATEGORY_COLORS[c.type],
    bytes: categoryBytes[c.type],
  })).filter((s) => s.bytes > 0)

  // /files/all (which categoryBytes is built from) excludes trashed files, but /files/usage
  // still counts them against the quota — the gap is trashed files (there's no trash-size
  // API to read it directly). Surface it as a "휴지통" slice, like Google Drive does, so the
  // ring accounts for 100% of what's counted against the quota.
  const uncategorizedBytes = Math.max(
    0,
    usage.usedBytes - legend.reduce((sum, s) => sum + s.bytes, 0),
  )
  if (uncategorizedBytes > 0) {
    legend.push({
      type: 'UNCATEGORIZED',
      label: '휴지통',
      icon: TrashIcon,
      color: { light: '#94a3b8', dark: '#64748b' },
      bytes: uncategorizedBytes,
    })
  }
  legend.sort((a, b) => b.bytes - a.bytes)

  // Meter segments are each category's share of the WHOLE quota, so the coloured strip only
  // fills as far as storage is actually used — the grey remainder is free space.
  const slices = legend.map((s) => ({
    ...s,
    quotaShare: usage.quotaBytes > 0 ? s.bytes / usage.quotaBytes : 0,
    fill: theme === 'dark' ? s.color.dark : s.color.light,
  }))

  const percent = usage.quotaBytes > 0 ? Math.round((usage.usedBytes / usage.quotaBytes) * 100) : 0

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="shrink-0 pb-6 text-lg font-medium text-slate-900 dark:text-slate-100">저장용량</h1>

      {tableFiles.length === 0 ? (
        <EmptyState label="저장된 파일이 없습니다" icon={CloudIcon} />
      ) : (
      <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-2xl shrink-0 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight tabular-nums text-brand-600 dark:text-brand-400">
            {formatFileSize(usage.usedBytes)}
          </span>
          <span className="text-sm text-slate-400 dark:text-slate-500">
            / {formatFileSize(usage.quotaBytes)} · {percent}% 사용
          </span>
        </div>

        <div className="mt-5 flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {slices.map((s) => (
            <span key={s.type} className="h-full" style={{ width: `${s.quotaShare * 100}%`, background: s.fill }} />
          ))}
        </div>

        <ul className="mt-7 grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm sm:grid-cols-2">
          {slices.map((s) => (
            <li key={s.type} className="flex items-center gap-2.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.fill }} />
              <s.icon size={15} className="shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="text-slate-700 dark:text-slate-200">{s.label}</span>
              <span className="ml-auto tabular-nums text-slate-500 dark:text-slate-400">
                {formatFileSize(s.bytes)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
            <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="w-14 py-2 pr-3 font-medium whitespace-nowrap">종류</th>
              <th className="py-2 font-medium">
                <SortHeader
                  label="이름"
                  active={sortField === 'name'}
                  dir={sortField === 'name' ? sortDir : 'desc'}
                  onClick={() => toggleSort('name')}
                />
              </th>
              <th className="w-24 py-2 pr-8 text-right font-medium">
                <SortHeader
                  label="크기"
                  align="right"
                  active={sortField === 'size'}
                  dir={sortField === 'size' ? sortDir : 'desc'}
                  onClick={() => toggleSort('size')}
                />
              </th>
              <th className="w-32 py-2 pr-8 font-medium">위치</th>
            </tr>
          </thead>
          <tbody>
            {shownFiles.map((file) => (
              <tr key={file.fileId} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2.5 pr-3">
                  <EntryIcon name={file.name} category={file.category} directory={file.directory} />
                </td>
                <td className="py-2.5 text-slate-800 dark:text-slate-200">{file.name}</td>
                <td className="py-2.5 pr-8 text-right text-slate-500 dark:text-slate-400">
                  {formatFileSize(file.fileSize)}
                </td>
                <td className="py-2.5 pr-8">
                  <button
                    type="button"
                    onClick={() => openLocation(file)}
                    className="-ml-1.5 block max-w-full truncate rounded-md px-1.5 py-0.5 text-left text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    {locationText(file)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hasMore && <div ref={sentinelRef} aria-hidden className="h-8" />}
      </div>
      </div>
      )}
    </div>
  )
}
