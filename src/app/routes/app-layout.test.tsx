import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import AppLayoutRoute from '@/app/routes/app-layout'
import { useAlertStore } from '@/stores/alert-store'
import { useAuthStore, type AnonymousReason } from '@/stores/auth-store'

function renderSignedOutAt(reason: AnonymousReason) {
  useAuthStore.setState({ status: 'anonymous', anonymousReason: reason })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/drive']}>
        <Routes>
          <Route path="/drive" element={<AppLayoutRoute />} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AppLayoutRoute without a session', () => {
  beforeEach(() => {
    useAlertStore.setState({ message: null })
  })

  it('sends a visitor who never had a session to login and says a login is needed', () => {
    renderSignedOutAt('no-session')

    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(useAlertStore.getState().message).toBe('로그인이 필요합니다.')
  })

  it.each<AnonymousReason>(['expired', 'signed-out'])(
    'adds no notice of its own after %s — expiry has its own, a logout needs none',
    (reason) => {
      renderSignedOutAt(reason)

      expect(screen.getByText('login page')).toBeInTheDocument()
      expect(useAlertStore.getState().message).toBeNull()
    },
  )
})
