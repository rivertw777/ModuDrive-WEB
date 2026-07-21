import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LandingRoute from '@/app/routes/landing'

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingRoute />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
