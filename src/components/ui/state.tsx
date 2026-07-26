import { AlertCircleIcon, FolderOpenIcon, LoaderIcon } from './icons'

export function LoadingState({ label = '불러오는 중...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-500 dark:text-neutral-400">
      <LoaderIcon size={22} className="animate-spin" />
      {label}
    </div>
  )
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-500 dark:text-neutral-400">
      <FolderOpenIcon size={32} className="text-slate-300 dark:text-neutral-700" />
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
