import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@/components/ui/icons'

export function Breadcrumb({ path }: { path: string }) {
  const segments = path.split('/').filter(Boolean)

  return (
    <nav className="flex items-center gap-1 text-lg">
      <Link
        to="/drive"
        className="rounded-md px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        내 드라이브
      </Link>
      {segments.map((segment, index) => {
        const href = `/drive/${segments.slice(0, index + 1).join('/')}`
        const isLast = index === segments.length - 1
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRightIcon size={16} className="text-slate-400 dark:text-neutral-600" />
            {isLast ? (
              <span className="rounded-md px-1.5 py-0.5 font-medium text-slate-900 dark:text-neutral-100">
                {segment}
              </span>
            ) : (
              <Link
                to={href}
                className="rounded-md px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {segment}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
