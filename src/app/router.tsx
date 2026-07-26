import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LandingRoute from '@/app/routes/landing'
import LoginRoute from '@/app/routes/login'
import SignupRoute from '@/app/routes/signup'
import AppLayoutRoute from '@/app/routes/app-layout'
import DriveRoute from '@/app/routes/drive'
import SharedRoute from '@/app/routes/shared'
import TrashRoute from '@/app/routes/trash'
import SearchRoute from '@/app/routes/search'
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
    path: '/drive',
    element: <AppLayoutRoute />,
    children: [
      { index: true, element: <DriveRoute /> },
      { path: '*', element: <DriveRoute /> },
    ],
  },
  {
    path: '/shared',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <SharedRoute /> }],
  },
  {
    path: '/trash',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <TrashRoute /> }],
  },
  {
    path: '/search',
    element: <AppLayoutRoute />,
    children: [{ index: true, element: <SearchRoute /> }],
  },
  {
    path: '*',
    element: <NotFoundRoute />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
