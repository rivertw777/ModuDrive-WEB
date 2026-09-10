import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FileRoute from './file'
import { useAuthStore } from '@/stores/auth-store'

const useFile = vi.fn()
const usePublicFile = vi.fn()
const useCurrentMember = vi.fn()

vi.mock('@/features/drive', () => ({
  useFile: (...args: unknown[]) => useFile(...args),
  usePublicFile: (...args: unknown[]) => usePublicFile(...args),
  PublicFileView: ({ fileId, shareKey }: { fileId: string; shareKey: string | null }) => (
    <div>
      anonymous view {fileId} / {String(shareKey)}
    </div>
  ),
}))
vi.mock('@/features/auth', () => ({
  useCurrentMember: (...args: unknown[]) => useCurrentMember(...args),
}))

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/files/:fileId" element={<FileRoute />} />
        <Route path="/drive/*" element={<div>drive explorer</div>} />
        <Route path="/shared" element={<div>shared explorer</div>} />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('FileRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null })
    usePublicFile.mockReturnValue({ isLoading: false, isError: true })
  })

  describe('signed out', () => {
    it('shows the anonymous view when the file is reachable without an account (LINK scope, or a valid guest key)', () => {
      usePublicFile.mockReturnValue({ isLoading: false, isError: false })

      renderAt('/files/f-1?key=k-1')

      expect(screen.getByText('anonymous view f-1 / k-1')).toBeInTheDocument()
      expect(useFile).not.toHaveBeenCalled()
    })

    it('sends an unreachable file to /login instead of asserting it does not exist', () => {
      // file-service 404s identically for "doesn't exist" and "exists, log in to see it" — a
      // signed-out visitor can't be shown which, so this is also where a bogus link ends up.
      renderAt('/files/f-1')

      expect(screen.getByText('login page')).toBeInTheDocument()
    })

    it('shows a loading state while the anonymous lookup is in flight', () => {
      usePublicFile.mockReturnValue({ isLoading: true, isError: false })

      renderAt('/files/f-1')

      expect(screen.queryByText('login page')).not.toBeInTheDocument()
      expect(screen.queryByText(/anonymous view/)).not.toBeInTheDocument()
    })
  })

  describe('signed in', () => {
    beforeEach(() => {
      useAuthStore.setState({ accessToken: 'token' })
    })

    it('shows loading while the file or the current member is still resolving', () => {
      useFile.mockReturnValue({ isLoading: true, isError: false, data: undefined })
      useCurrentMember.mockReturnValue({ data: undefined })

      renderAt('/files/f-1')

      expect(screen.queryByText('drive explorer')).not.toBeInTheDocument()
      expect(screen.queryByText('shared explorer')).not.toBeInTheDocument()
    })

    it('redirects an owned root-level file into 내 드라이브 with it pre-selected', () => {
      useFile.mockReturnValue({ isLoading: false, isError: false, data: { ownerId: 'me', path: '/' } })
      useCurrentMember.mockReturnValue({ data: { id: 'me' } })

      renderAt('/files/f-1')

      expect(screen.getByText('drive explorer')).toBeInTheDocument()
    })

    it('redirects a shared file into 공유 문서함 with it pre-selected', () => {
      useFile.mockReturnValue({
        isLoading: false,
        isError: false,
        data: { ownerId: 'someone-else', path: '/docs' },
      })
      useCurrentMember.mockReturnValue({ data: { id: 'me' } })

      renderAt('/files/f-1')

      expect(screen.getByText('shared explorer')).toBeInTheDocument()
    })

    it('falls back to the anonymous view when signed in but not yet a real grantee (e.g. an unclaimed guest invite)', () => {
      useFile.mockReturnValue({ isLoading: false, isError: true, data: undefined })
      usePublicFile.mockReturnValue({ isLoading: false, isError: false })

      renderAt('/files/f-1?key=k-1')

      expect(screen.getByText('anonymous view f-1 / k-1')).toBeInTheDocument()
    })

    it('shows access-denied, not a login redirect, when neither check finds any access', () => {
      useFile.mockReturnValue({ isLoading: false, isError: true, data: undefined })
      usePublicFile.mockReturnValue({ isLoading: false, isError: true })

      renderAt('/files/f-1')

      expect(screen.getByText('이 파일에 접근할 권한이 없습니다')).toBeInTheDocument()
      expect(screen.queryByText('login page')).not.toBeInTheDocument()
    })
  })
})
