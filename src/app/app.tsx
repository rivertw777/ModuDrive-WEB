import { AppProvider } from '@/app/provider'
import { AppRouter } from '@/app/router'
import { useSessionBootstrap } from '@/features/auth'

export default function App() {
  useSessionBootstrap()
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}
