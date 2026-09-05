import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import FileRoute from './file'

const useFile = vi.fn()
const useCurrentMember = vi.fn()

vi.mock('@/features/drive', () => ({ useFile: (...args: unknown[]) => useFile(...args) }))
vi.mock('@/features/auth', () => ({ useCurrentMember: (...args: unknown[]) => useCurrentMember(...args) }))

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/files/:fileId" element={<FileRoute />} />
        <Route path="/drive/*" element={<div>drive explorer</div>} />
        <Route path="/shared" element={<div>shared explorer</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('FileRoute', () => {
  it('shows loading while the file or the current member is still resolving', () => {
    useFile.mockReturnValue({ isLoading: true, isError: false, data: undefined })
    useCurrentMember.mockReturnValue({ data: undefined })

    renderAt('/files/f-1')

    expect(screen.queryByText('drive explorer')).not.toBeInTheDocument()
    expect(screen.queryByText('shared explorer')).not.toBeInTheDocument()
  })

  it('shows an error state when the file can\'t be loaded', () => {
    useFile.mockReturnValue({ isLoading: false, isError: true, data: undefined })
    useCurrentMember.mockReturnValue({ data: { id: 'me' } })

    renderAt('/files/f-1')

    expect(screen.getByText('파일을 찾을 수 없습니다')).toBeInTheDocument()
  })

  it('redirects an owned root-level file into 내 드라이브 with it pre-selected', () => {
    useFile.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { ownerId: 'me', path: '/' },
    })
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
})
