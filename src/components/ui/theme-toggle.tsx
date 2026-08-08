import { useThemeStore } from '@/stores/theme-store'
import { MoonIcon, SunIcon } from './icons'

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const toggle = useThemeStore((state) => state.toggle)

  return (
    <button
      onClick={toggle}
      aria-label="테마 전환"
      className="inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
    >
      {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
    </button>
  )
}
