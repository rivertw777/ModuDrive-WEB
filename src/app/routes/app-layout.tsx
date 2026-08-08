import { Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useCurrentMember } from '@/features/auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  FileIcon,
  FolderIcon,
  ImageIcon,
  LogOutIcon,
  MusicIcon,
  StarIcon,
  TrashIcon,
  UsersIcon,
  VideoIcon,
} from '@/components/ui/icons'
import { SearchBar, StorageUsage, FILE_CATEGORIES } from '@/features/drive'
import { cn } from '@/utils/cn'
import { useResizableWidth, ResizeHandle } from '@/components/ui/use-resizable-width'

const CATEGORY_ICONS = { IMAGE: ImageIcon, VIDEO: VideoIcon, DOCUMENT: FileIcon, AUDIO: MusicIcon } as const

const NAV_LINK_CLASS =
  'flex items-center gap-3 rounded-full px-3 py-2 font-medium transition-colors'
const NAV_LINK_ACTIVE_CLASS = 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
const NAV_LINK_INACTIVE_CLASS =
  'text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

export default function AppLayoutRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const logout = useAuthStore((state) => state.logout)
  const { data: member } = useCurrentMember(accessToken !== null)
  const location = useLocation()
  const isDriveActive = location.pathname.startsWith('/drive')
  const isFavoritesActive = location.pathname.startsWith('/favorites')
  const isTrashActive = location.pathname.startsWith('/trash')
  const isSharedActive = location.pathname.startsWith('/shared')
  const sidebar = useResizableWidth('modudrive.sidebarWidth', 240, 200, 400, 'right')

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-950">
      <aside
        style={{ width: sidebar.width }}
        className="relative flex shrink-0 flex-col border-r border-slate-200 p-4 dark:border-neutral-800"
      >
        <Link to="/drive" className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            M
          </span>
          <span className="text-lg font-semibold text-slate-900 dark:text-neutral-100">ModuDrive</span>
        </Link>

        <nav className="mt-6 flex flex-col gap-1 text-sm">
          <Link
            to="/drive"
            className={cn(NAV_LINK_CLASS, isDriveActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS)}
          >
            <FolderIcon size={18} />내 드라이브
          </Link>
          <div className="ml-4 flex flex-col gap-1 border-l border-slate-200 pl-3 dark:border-neutral-800">
            {FILE_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.type]
              const isActive = location.pathname === `/category/${category.slug}`
              return (
                <Link
                  key={category.slug}
                  to={`/category/${category.slug}`}
                  className={cn(NAV_LINK_CLASS, isActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS)}
                >
                  <Icon size={18} />
                  {category.label}
                </Link>
              )
            })}
          </div>
          <Link
            to="/favorites"
            className={cn(NAV_LINK_CLASS, isFavoritesActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS)}
          >
            <StarIcon size={18} />
            즐겨찾기
          </Link>
          <Link
            to="/shared"
            className={cn(NAV_LINK_CLASS, isSharedActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS)}
          >
            <UsersIcon size={18} />
            공유 문서함
          </Link>
          <Link
            to="/trash"
            className={cn(NAV_LINK_CLASS, isTrashActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS)}
          >
            <TrashIcon size={18} />
            휴지통
          </Link>
        </nav>

        <div className="mt-auto">
          <StorageUsage />

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-neutral-800">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                {member?.name?.slice(0, 1) ?? '?'}
              </span>
              {member && (
                <span className="truncate text-sm text-slate-600 dark:text-neutral-400">{member.name}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={logout}
                aria-label="로그아웃"
                className="inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <LogOutIcon size={17} />
              </button>
            </div>
          </div>
        </div>

        <ResizeHandle edge="right" onMouseDown={sidebar.onMouseDown} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center border-b border-slate-200 px-6 py-3 dark:border-neutral-800">
          <SearchBar />
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
