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
}: {
  label: string
  icon?: EmptyStateIcon
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-base text-slate-500 dark:text-slate-400">
      <Icon size={56} className="text-slate-300 dark:text-slate-600" />
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
