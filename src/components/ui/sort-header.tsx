import { ArrowDownIcon } from './icons'

export function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 font-medium leading-none ${align === 'right' ? 'ml-auto' : ''}`}
    >
      <span className="leading-none">{label}</span>
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border leading-none transition-colors ${
          active
            ? 'border-violet-600 bg-violet-600 text-white dark:border-violet-500 dark:bg-violet-500'
            : 'border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500'
        }`}
      >
        <ArrowDownIcon size={15} className={dir === 'asc' ? 'rotate-180' : ''} />
      </span>
    </button>
  )
}
