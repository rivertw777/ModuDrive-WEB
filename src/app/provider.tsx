import { type ReactNode, Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/react-query'
import { GlobalAlert } from '@/app/global-alert'

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <QueryClientProvider client={queryClient}>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        {children}
        <GlobalAlert />
      </QueryClientProvider>
    </Suspense>
  )
}
