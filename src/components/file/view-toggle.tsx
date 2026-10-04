import { GridIcon, ListIcon } from '@/components/ui/icons'
import { useFileViewStore, type FileViewMode } from '@/stores/file-view-store'
import { cn } from '@/utils/cn'

const OPTIONS: { mode: FileViewMode; label: string; icon: typeof ListIcon }[] = [
  { mode: 'list', label: '목록으로 보기', icon: ListIcon },
  { mode: 'grid', label: '큰 아이콘으로 보기', icon: GridIcon },
]

/** Two-button segmented control matching the app's existing icon-button styling. Self-contained —
 * reads/writes the shared view-mode store directly, so any header row can drop it in as-is. */
export function ViewToggle() {
  const mode = useFileViewStore((state) => state.mode)
  const setMode = useFileViewStore((state) => state.setMode)
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 p-0.5 dark:border-slate-600">
      {OPTIONS.map(({ mode: optionMode, label, icon: Icon }) => (
        <button
          key={optionMode}
          type="button"
          aria-label={label}
          aria-pressed={mode === optionMode}
          onClick={() => setMode(optionMode)}
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-full transition-colors',
            mode === optionMode
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-700 dark:text-white'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200',
          )}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  )
}
