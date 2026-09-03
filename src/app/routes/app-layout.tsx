import { Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useCurrentMember, useLogout } from '@/features/auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  ClockIcon,
  CloudIcon,
  DocumentIcon,
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
import { NotificationBell } from '@/features/notifications'
import { cn } from '@/utils/cn'
import { useResizableWidth, ResizeHandle } from '@/components/ui/use-resizable-width'

const CATEGORY_ICONS = {
  IMAGE: ImageIcon,
  VIDEO: VideoIcon,
  DOCUMENT: DocumentIcon,
  AUDIO: MusicIcon,
  OTHER: FileIcon,
} as const

const NAV_LINK_CLASS =
  'flex items-center gap-3 rounded-full px-3 py-2 font-medium transition-colors'
const NAV_LINK_ACTIVE_CLASS = 'bg-brand-100 text-brand-700 dark:bg-brand-700 dark:text-white'
const NAV_LINK_INACTIVE_CLASS =
  'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'

export default function AppLayoutRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const { data: member } = useCurrentMember(accessToken !== null)
  const logoutMutation = useLogout()
  const location = useLocation()
  const isDriveActive = location.pathname.startsWith('/drive')
  const isFavoritesActive = location.pathname.startsWith('/favorites')
  const isRecentActive = location.pathname.startsWith('/recent')
  const isStorageActive = location.pathname.startsWith('/storage')
  const isTrashActive = location.pathname.startsWith('/trash')
  const isSharedActive = location.pathname.startsWith('/shared')
  const sidebar = useResizableWidth('modudrive.sidebarWidth', 240, 200, 400, 'right')

  if (!accessToken) {
    // Preserve where the user was headed (e.g. a shared-file deep link) so login can
    // send them back instead of always landing on /drive.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-900">
      <header className="z-20 flex shrink-0 items-center gap-4 border-b border-slate-200/80 pr-6 shadow-[0_2px_6px_-2px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]">
        <Link
          to="/drive"
          className="flex shrink-0 items-center gap-2 px-4 py-3"
        >
          <img src="/logo.png" alt="ModuDrive" className="size-7" />
          <span className="font-brand text-[1.375rem] font-bold text-[#1C3D5A] dark:text-[#F5F3EE]">
            ModuDrive
          </span>
        </Link>
        <div className="flex flex-1 items-center gap-3 py-3">
          <SearchBar />
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
      <aside
        style={{ width: sidebar.width }}
        className="relative flex shrink-0 flex-col border-r border-slate-200 p-4 dark:border-slate-700"
      >
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            to="/drive"
            className={cn(
              NAV_LINK_CLASS,
              isDriveActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS,
            )}
          >
            <FolderIcon size={18} />내 드라이브
          </Link>
          <div className="ml-4 flex flex-col gap-1 border-l border-slate-200 pl-3 dark:border-slate-700">
            {FILE_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.type]
              const isActive = location.pathname === `/category/${category.slug}`
              return (
                <Link
                  key={category.slug}
                  to={`/category/${category.slug}`}
                  className={cn(
                    NAV_LINK_CLASS,
                    isActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS,
                  )}
                >
                  <Icon size={18} />
                  {category.label}
                </Link>
              )
            })}
          </div>

          <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

          <Link
            to="/shared"
            className={cn(
              NAV_LINK_CLASS,
              isSharedActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS,
            )}
          >
            <UsersIcon size={18} />
            공유 문서함
          </Link>
          <Link
            to="/recent"
            className={cn(
              NAV_LINK_CLASS,
              isRecentActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS,
            )}
          >
            <ClockIcon size={18} />
            최근 문서함
          </Link>
          <Link
            to="/favorites"
            className={cn(
              NAV_LINK_CLASS,
              isFavoritesActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS,
            )}
          >
            <StarIcon size={18} />
            즐겨찾기
          </Link>

          <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

          <Link
            to="/storage"
            className={cn(
              NAV_LINK_CLASS,
              isStorageActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS,
            )}
          >
            <CloudIcon size={18} />
            저장용량
          </Link>
          <Link
            to="/trash"
            className={cn(
              NAV_LINK_CLASS,
              isTrashActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_INACTIVE_CLASS,
            )}
          >
            <TrashIcon size={18} />
            휴지통
          </Link>
        </nav>

        <div className="mt-auto">
          <StorageUsage />

          {/* ponytail: no billing flow yet, button is a placeholder until upgrade tiers exist */}
          <button className="mb-3 w-full rounded-full border border-brand-600 px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-brand-950">
            드라이브 업그레이드
          </button>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                {member?.name?.slice(0, 1) ?? '?'}
              </span>
              {member && (
                <span className="truncate text-sm text-slate-600 dark:text-slate-400">
                  {member.name}
                </span>
              )}
            </div>
            <button
              onClick={() => logoutMutation.mutate()}
              aria-label="로그아웃"
              className="inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <LogOutIcon size={17} />
            </button>
          </div>
        </div>

        <ResizeHandle edge="right" onMouseDown={sidebar.onMouseDown} />
      </aside>

      {/* min-h-0 overrides the flex default of "shrink no smaller than content" so this
          pane actually clips at the viewport edge — each route then owns its own internal
          scroll region (header pinned, list scrollable) instead of the whole page scrolling. */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      </div>
    </div>
  )
}
