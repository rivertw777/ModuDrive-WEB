import { cn } from '@/utils/cn'
import { AlertCircleIcon, FolderOpenIcon, LoaderIcon } from './icons'

export function LoadingState({ label = '불러오는 중...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400">
      <LoaderIcon size={22} className="animate-spin" />
      {label}
    </div>
  )
}

export type EmptyStateIcon = typeof FolderOpenIcon

export function EmptyState({
  label,
  icon: Icon = FolderOpenIcon,
  // Full explorer pages have no defined height to center within, so they get a viewport-relative
  // min-height. Dialogs like move-dialog already sit in a fixed-height (h-72) scroll box —
  // min-h-[60vh] there would blow past it and force a pointless scrollbar, so they pass
  // compact to just fill that box (h-full) instead.
  compact = false,
}: {
  label: string
  icon?: EmptyStateIcon
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400',
        compact ? 'h-full gap-2 text-sm' : 'min-h-[60vh] text-base',
      )}
    >
      <Icon size={compact ? 32 : 56} className="text-slate-300 dark:text-slate-600" />
      {label}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-sm text-red-600 dark:text-red-400">
      <AlertCircleIcon size={22} />
      {message}
    </div>
  )
}
