import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PublicFileRoute from './public-file'
import { useAuthStore } from '@/stores/auth-store'

const useFile = vi.fn()

vi.mock('@/features/drive', () => ({
  useFile: (...args: unknown[]) => useFile(...args),
  PublicFileView: ({ fileId, shareKey }: { fileId: string; shareKey: string | null }) => (
    <div>
      anonymous view {fileId} / {String(shareKey)}
    </div>
  ),
}))

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/public/:fileId" element={<PublicFileRoute />} />
        <Route path="/files/:fileId" element={<div>app file page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicFileRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null })
    useFile.mockReturnValue({ isLoading: false, isError: true })
  })

  it('shows the anonymous key view for a signed-out visitor', () => {
    renderAt('/public/f-1?key=k-1')
    expect(screen.getByText('anonymous view f-1 / k-1')).toBeInTheDocument()
  })

  it('opens the real app when a signed-in visitor has access', () => {
    useAuthStore.setState({ accessToken: 'token' })
    useFile.mockReturnValue({ isLoading: false, isError: false })

    renderAt('/public/f-1?key=k-1')

    expect(screen.getByText('app file page')).toBeInTheDocument()
  })

  it('falls back to the anonymous view when a signed-in visitor has no access yet', () => {
    useAuthStore.setState({ accessToken: 'token' })
    useFile.mockReturnValue({ isLoading: false, isError: true })

    renderAt('/public/f-1')

    expect(screen.getByText('anonymous view f-1 / null')).toBeInTheDocument()
  })

  it('opens the real app for a folder link too, when the signed-in visitor has access', () => {
    useAuthStore.setState({ accessToken: 'token' })
    useFile.mockReturnValue({ isLoading: false, isError: false, data: { directory: true } })

    renderAt('/public/f-1?key=k-1')

    expect(screen.getByText('app file page')).toBeInTheDocument()
  })
})
