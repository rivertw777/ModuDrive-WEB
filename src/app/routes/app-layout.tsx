import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useCurrentMember } from '@/features/auth'

export default function AppLayoutRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const logout = useAuthStore((state) => state.logout)
  const { data: member } = useCurrentMember(accessToken !== null)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-4">
        <Link to="/drive" className="text-lg font-semibold text-slate-900">
          ModuDrive
        </Link>
        <nav className="mt-6 text-sm">
          <Link to="/drive" className="block rounded-md px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100">
            내 드라이브
          </Link>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-slate-200 px-6 py-3">
          {member && <span className="text-sm text-slate-600">{member.name}</span>}
          <button onClick={logout} className="text-sm font-medium text-slate-500 hover:text-slate-900">
            로그아웃
          </button>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
