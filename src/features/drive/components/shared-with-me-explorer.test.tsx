import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SharedWithMeExplorer } from './shared-with-me-explorer'
import type { FileEntry } from '../types'

vi.mock('../api/list-shared-with-me', () => ({ useSharedWithMe: vi.fn() }))
vi.mock('../api/list-shared-directory', () => ({ useSharedDirectory: vi.fn() }))

// Mimic the real FileList: it fires onClearSelection once on mount (its marquee selection
// starts empty), and that mount can be delayed until its list query resolves — so fire the
// clear on a later macrotask, not synchronously. The explorer must ignore that first call
// whenever it lands so a ?file= deep link survives.
vi.mock('./file-list', () => ({
  FileList: ({
    selectedFileId,
    onClearSelection,
  }: {
    selectedFileId: string | null
    onClearSelection?: () => void
  }) => {
    useEffect(() => {
      const t = setTimeout(() => onClearSelection?.(), 0)
      return () => clearTimeout(t)
    }, [onClearSelection])
    return <div data-testid="file-list">selected:{selectedFileId ?? 'none'}</div>
  },
}))

vi.mock('./file-detail-panel', () => ({
  FileDetailPanel: ({ fileId }: { fileId: string }) => (
    <div data-testid="detail-panel">detail:{fileId}</div>
  ),
}))

const { useSharedWithMe } = await import('../api/list-shared-with-me')
const { useSharedDirectory } = await import('../api/list-shared-directory')

const file: FileEntry = {
  fileId: 'f1',
  name: '테스트.jpg',
  path: '/',
  directory: false,
  fileSize: 100,
  status: 'UPLOADED',
  favorite: false,
  updatedAt: '2026-09-03T08:31:00',
} as FileEntry

function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <SharedWithMeExplorer />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SharedWithMeExplorer', () => {
  beforeEach(() => {
    vi.mocked(useSharedWithMe).mockReturnValue({
      data: [file],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSharedWithMe>)
    vi.mocked(useSharedDirectory).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSharedDirectory>)
  })

  it('opens the detail panel for a ?file= deep link and keeps it despite the mount-time clear', async () => {
    renderAt('/shared?file=f1')

    expect(await screen.findByTestId('detail-panel')).toHaveTextContent('detail:f1')
    // Let FileList's deferred mount-time onClearSelection fire — it must be swallowed.
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(screen.getByTestId('detail-panel')).toHaveTextContent('detail:f1')
    expect(screen.getByTestId('file-list')).toHaveTextContent('selected:f1')
  })

  it('shows no panel without the param', () => {
    renderAt('/shared')
    expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument()
  })
})
