import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LandingRoute from '@/app/routes/landing'
import LoginRoute from '@/app/routes/login'
import SignupRoute from '@/app/routes/signup'
import AppLayoutRoute from '@/app/routes/app-layout'
import DriveRoute from '@/app/routes/drive'
import FavoritesRoute from '@/app/routes/favorites'
import RecentRoute from '@/app/routes/recent'
import TrashRoute from '@/app/routes/trash'
import SharedRoute from '@/app/routes/shared'
import NotificationsRoute from '@/app/routes/notifications'
import SearchRoute from '@/app/routes/search'
import CategoryRoute from '@/app/routes/category'
import StorageRoute from '@/app/routes/storage'
import PublicFileRoute from '@/app/routes/public-file'
import FileRoute from '@/app/routes/file'
import NotFoundRoute from '@/app/routes/not-found'

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingRoute />,
  },
  {
    path: '/login',
    element: <LoginRoute />,
  },
  {
    path: '/signup',
    element: <SignupRoute />,
  },
  {
    path: '/public/:token',
    element: <PublicFileRoute />,
  },
  {
    path: '/files/:fileId',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <FileRoute /> }],
  },
  {
    path: '/drive',
    element: <AppLayoutRoute />,
    children: [
      { index: true, element: <DriveRoute /> },
      { path: '*', element: <DriveRoute /> },
    ],
  },
  {
    path: '/favorites',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <FavoritesRoute /> }],
  },
  {
    path: '/recent',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <RecentRoute /> }],
  },
  {
    path: '/storage',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <StorageRoute /> }],
  },
  {
    path: '/trash',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <TrashRoute /> }],
  },
  {
    path: '/shared',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <SharedRoute /> }],
  },
  {
    path: '/notifications',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <NotificationsRoute /> }],
  },
  {
    path: '/search',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <SearchRoute /> }],
  },
  {
    path: '/category/:slug',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <CategoryRoute /> }],
  },
  {
    path: '*',
    element: <NotFoundRoute />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
