import { Link } from 'react-router-dom'

export function Breadcrumb({ path }: { path: string }) {
  const segments = path.split('/').filter(Boolean)

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500">
      <Link to="/drive" className="hover:text-slate-900 hover:underline">
        내 드라이브
      </Link>
      {segments.map((segment, index) => {
        const href = `/drive/${segments.slice(0, index + 1).join('/')}`
        const isLast = index === segments.length - 1
        return (
          <span key={href} className="flex items-center gap-1">
            <span>/</span>
            {isLast ? (
              <span className="font-medium text-slate-900">{segment}</span>
            ) : (
              <Link to={href} className="hover:text-slate-900 hover:underline">
                {segment}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
