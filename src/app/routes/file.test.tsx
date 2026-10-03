import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FileRoute from './file'
import { useAuthStore } from '@/stores/auth-store'
import { SERVER_ERROR_MESSAGE, useAlertStore } from '@/stores/alert-store'

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
    useAuthStore.setState({ status: 'anonymous' })
    usePublicFile.mockReturnValue({ isLoading: false, isError: true })
  })

  it('waits for the startup session check before deciding who is asking', () => {
    useAuthStore.setState({ status: 'checking' })

    renderAt('/files/f-1')

    expect(screen.queryByText('login page')).not.toBeInTheDocument()
    expect(useFile).not.toHaveBeenCalled()
    expect(usePublicFile).not.toHaveBeenCalled()
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

    it('sends a server failure to /login like a 4xx, but with the common error notice', () => {
      useAlertStore.setState({ message: null })
      usePublicFile.mockReturnValue({ isLoading: false, isError: true, error: { response: { status: 503 } } })

      renderAt('/files/f-1')

      expect(screen.getByText('login page')).toBeInTheDocument()
      expect(useAlertStore.getState().message).toBe(SERVER_ERROR_MESSAGE)
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
      useAuthStore.setState({ status: 'authenticated' })
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

    it('sends to /drive and queues a 파일-worded alert when the denied target is a file', () => {
      useAlertStore.setState({ message: null })
      useFile.mockReturnValue({
        isLoading: false,
        isError: true,
        data: undefined,
        error: { status: 403, data: { isDirectory: false } },
      })
      usePublicFile.mockReturnValue({ isLoading: false, isError: true })

      renderAt('/files/f-1')

      // GlobalAlert itself renders at the app root (outside this test's tree) — here we only
      // pin that the navigate happens and the store it reads is queued, in that order.
      expect(screen.getByText('drive explorer')).toBeInTheDocument()
      expect(useAlertStore.getState().message).toBe('이 파일에 접근할 권한이 없습니다')
      expect(screen.queryByText('login page')).not.toBeInTheDocument()
    })

    it('queues a 폴더-worded alert when the denied target is a directory', () => {
      useAlertStore.setState({ message: null })
      useFile.mockReturnValue({
        isLoading: false,
        isError: true,
        data: undefined,
        error: { status: 403, data: { isDirectory: true } },
      })
      usePublicFile.mockReturnValue({ isLoading: false, isError: true })

      renderAt('/files/f-1')

      expect(useAlertStore.getState().message).toBe('이 폴더에 접근할 권한이 없습니다')
    })

    it('sends a server failure to /drive like a 4xx, but with the common error notice instead of access denied', () => {
      useAlertStore.setState({ message: null })
      useFile.mockReturnValue({ isLoading: false, isError: true, data: undefined, error: { status: 503 } })

      renderAt('/files/f-1')

      expect(screen.getByText('drive explorer')).toBeInTheDocument()
      expect(useAlertStore.getState().message).toBe(SERVER_ERROR_MESSAGE)
    })

    it('treats a server failure of the public fallback lookup the same way', () => {
      useAlertStore.setState({ message: null })
      useFile.mockReturnValue({ isLoading: false, isError: true, data: undefined, error: { status: 404 } })
      usePublicFile.mockReturnValue({ isLoading: false, isError: true, error: { response: { status: 502 } } })

      renderAt('/files/f-1')

      expect(screen.getByText('drive explorer')).toBeInTheDocument()
      expect(useAlertStore.getState().message).toBe(SERVER_ERROR_MESSAGE)
    })

    it('falls back to a type-agnostic 항목 wording when the file genuinely does not exist', () => {
      useAlertStore.setState({ message: null })
      // A real FILE_NOT_FOUND carries no isDirectory (see FileAccessGuard) — this pins the
      // fallback wording rather than defaulting to either 파일 or 폴더.
      useFile.mockReturnValue({ isLoading: false, isError: true, data: undefined, error: Object.assign(new Error('not found'), { status: 404 }) })
      usePublicFile.mockReturnValue({ isLoading: false, isError: true })

      renderAt('/files/f-1')

      expect(useAlertStore.getState().message).toBe('이 항목에 접근할 권한이 없습니다')
    })
  })
})
