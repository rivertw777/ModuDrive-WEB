import { useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { SortHeader } from '@/components/ui/sort-header'
import { DocumentIcon, FilesIcon, ImageIcon, MusicIcon, VideoIcon } from '@/components/ui/icons'
import { useStorageUsage } from '../api/get-storage-usage'
import { useAllFiles } from '../api/list-all-files'
import { FILE_CATEGORIES, formatFileSize, type FileCategory } from '../types'
import { EntryIcon } from './entry-icon'

// Fixed categorical order/colors, validated for CVD-safe adjacency (dataviz skill).
const CATEGORY_COLORS: Record<FileCategory, { light: string; dark: string }> = {
  IMAGE: { light: '#2a78d6', dark: '#3987e5' },
  VIDEO: { light: '#eb6834', dark: '#d95926' },
  DOCUMENT: { light: '#1baf7a', dark: '#199e70' },
  AUDIO: { light: '#eda100', dark: '#c98500' },
  OTHER: { light: '#e87ba4', dark: '#d55181' },
}
const CATEGORY_ICONS = { IMAGE: ImageIcon, VIDEO: VideoIcon, DOCUMENT: DocumentIcon, AUDIO: MusicIcon, OTHER: FilesIcon } as const

const RADIUS = 110
const STROKE = 32
const SIZE = (RADIUS + STROKE) * 2
const CENTER = SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 2 // px, matches dataviz mark spec (surface gap between adjacent segments)

type SortField = 'name' | 'size'
type SortDir = 'asc' | 'desc'

export function StorageExplorer() {
  const { data: usage, isLoading: usageLoading, isError: usageError } = useStorageUsage()
  const { data: entries, isLoading: filesLoading, isError: filesError } = useAllFiles()
  const [sortField, setSortField] = useState<SortField>('size')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  if (usageLoading || filesLoading) return <LoadingState />
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

  // /api/v1/files/all already excludes folders and trashed files.
  const dirSign = sortDir === 'asc' ? 1 : -1
  const files = [...entries].sort((a, b) =>
    sortField === 'name' ? dirSign * a.name.localeCompare(b.name) : dirSign * ((a.fileSize ?? 0) - (b.fileSize ?? 0)),
  )

  const categoryBytes: Record<FileCategory, number> = { IMAGE: 0, VIDEO: 0, DOCUMENT: 0, AUDIO: 0, OTHER: 0 }
  for (const file of files) {
    categoryBytes[file.category] += file.fileSize ?? 0
  }

  const legend = FILE_CATEGORIES.map((c) => ({
    type: c.type,
    label: c.label,
    icon: CATEGORY_ICONS[c.type],
    color: CATEGORY_COLORS[c.type],
    bytes: categoryBytes[c.type],
  })).filter((s) => s.bytes > 0)

  let offset = 0
  const arcs = legend.map((s) => {
    const fraction = usage.quotaBytes > 0 ? s.bytes / usage.quotaBytes : 0
    const len = Math.max(0, fraction * CIRCUMFERENCE - GAP)
    const dashoffset = -offset * CIRCUMFERENCE
    offset += fraction
    return { ...s, len, dashoffset }
  })

  const percent = usage.quotaBytes > 0 ? Math.round((usage.usedBytes / usage.quotaBytes) * 100) : 0

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="shrink-0 pb-6 text-lg font-medium text-slate-900 dark:text-slate-100">저장용량</h1>

      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0 -rotate-90">
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-slate-100 dark:stroke-slate-800"
          />
          {arcs.map((arc) => (
            <circle
              key={arc.type}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              stroke={arc.color.light}
              className="dark:hidden"
              strokeDasharray={`${arc.len} ${CIRCUMFERENCE}`}
              strokeDashoffset={arc.dashoffset}
            />
          ))}
          {arcs.map((arc) => (
            <circle
              key={`${arc.type}-dark`}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              stroke={arc.color.dark}
              className="hidden dark:inline"
              strokeDasharray={`${arc.len} ${CIRCUMFERENCE}`}
              strokeDashoffset={arc.dashoffset}
            />
          ))}
          <text
            x={CENTER}
            y={CENTER - 6}
            textAnchor="middle"
            transform={`rotate(90 ${CENTER} ${CENTER})`}
            className="fill-slate-900 text-3xl font-semibold dark:fill-slate-100"
          >
            {percent}%
          </text>
          <text
            x={CENTER}
            y={CENTER + 20}
            textAnchor="middle"
            transform={`rotate(90 ${CENTER} ${CENTER})`}
            className="fill-slate-500 text-sm dark:fill-slate-400"
          >
            {formatFileSize(usage.usedBytes)} / {formatFileSize(usage.quotaBytes)}
          </text>
        </svg>

        <ul className="flex flex-col gap-2 text-sm">
          {legend.map((s) => (
            <li key={s.type} className="flex items-center gap-2">
              <span className="relative size-2.5 shrink-0 rounded-full">
                <span className="absolute inset-0 rounded-full dark:hidden" style={{ background: s.color.light }} />
                <span className="absolute inset-0 hidden rounded-full dark:block" style={{ background: s.color.dark }} />
              </span>
              <s.icon size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="text-slate-700 dark:text-slate-300">{s.label}</span>
              <span className="text-slate-400 dark:text-slate-500">{formatFileSize(s.bytes)}</span>
            </li>
          ))}
        </ul>
      </div>

      {files.length === 0 ? (
        <p className="mt-8 py-8 text-center text-sm text-slate-400 dark:text-slate-500">파일이 없습니다</p>
      ) : (
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="py-2 font-medium">
                <SortHeader
                  label="이름"
                  active={sortField === 'name'}
                  dir={sortField === 'name' ? sortDir : 'desc'}
                  onClick={() => toggleSort('name')}
                />
              </th>
              <th className="w-40 py-2 pr-4 text-right font-medium">
                <SortHeader
                  label="사용된 저장용량"
                  align="right"
                  active={sortField === 'size'}
                  dir={sortField === 'size' ? sortDir : 'desc'}
                  onClick={() => toggleSort('size')}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.fileId} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2.5">
                  <span className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
                    <EntryIcon name={file.name} category={file.category} directory={file.directory} />
                    {file.name}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right text-slate-500 dark:text-slate-400">
                  {formatFileSize(file.fileSize)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </div>
  )
}
