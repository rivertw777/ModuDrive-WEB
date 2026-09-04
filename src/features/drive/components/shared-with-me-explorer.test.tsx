import { StrictMode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SharedWithMeExplorer } from './shared-with-me-explorer'
import type { FileEntry } from '../types'

vi.mock('../api/list-shared-with-me', () => ({
  useSharedWithMe: vi.fn(),
  listSharedWithMe: vi.fn(),
}))
vi.mock('../api/list-shared-directory', () => ({
  useSharedDirectory: vi.fn(),
  listSharedDirectory: vi.fn(),
}))
vi.mock('../api/get-file', () => ({ getFile: vi.fn() }))

// The real FileList never fires onClearSelection on mount (see useRowSelection's onEmpty guard)
// — its marquee selection starts empty, and that's not a real clear — so this mock doesn't
// simulate one either; onClearSelection here only ever fires from a genuine user action.
vi.mock('./file-list', () => ({
  FileList: ({
    selectedFileId,
    onNavigate,
    showSharedBy,
    dateColumn,
  }: {
    selectedFileId: string | null
    onClearSelection?: () => void
    onNavigate: (path: string) => void
    showSharedBy?: boolean
    dateColumn?: { label: string; getValue: (file: FileEntry) => string | null | undefined }
  }) => (
    <div data-testid="file-list">
      selected:{selectedFileId ?? 'none'} showSharedBy:{String(showSharedBy)} dateLabel:
      {dateColumn?.label ?? 'none'}
      <button onClick={() => onNavigate('/폴더')}>enter folder</button>
    </div>
  ),
}))

vi.mock('./file-detail-panel', () => ({
  FileDetailPanel: ({ fileId }: { fileId: string }) => (
    <div data-testid="detail-panel">detail:{fileId}</div>
  ),
}))

const { useSharedWithMe, listSharedWithMe } = await import('../api/list-shared-with-me')
const { useSharedDirectory, listSharedDirectory } = await import('../api/list-shared-directory')
const { getFile } = await import('../api/get-file')

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

const folder: FileEntry = {
  fileId: 'd1',
  name: '폴더',
  path: '/',
  directory: true,
  fileSize: null,
  status: 'UPLOADED',
  favorite: false,
  updatedAt: '2026-09-03T08:31:00',
} as FileEntry

function renderAt(path: string, strict = false) {
  const tree = (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <SharedWithMeExplorer />
      </MemoryRouter>
    </QueryClientProvider>
  )
  render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

describe('SharedWithMeExplorer', () => {
  beforeEach(() => {
    vi.mocked(useSharedWithMe).mockReturnValue({
      data: [file],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSharedWithMe>)
    vi.mocked(useSharedDirectory).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSharedDirectory>)
  })

  it('opens the detail panel for a ?file= deep link', async () => {
    renderAt('/shared?file=f1')

    expect(await screen.findByTestId('detail-panel')).toHaveTextContent('detail:f1')
    expect(screen.getByTestId('file-list')).toHaveTextContent('selected:f1')
  })

  it('shows no panel without the param', () => {
    renderAt('/shared')
    expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument()
  })

  it('keeps the 공유한 사용자/공유된 날짜 columns after navigating into a shared folder', async () => {
    vi.mocked(useSharedWithMe).mockReturnValue({
      data: [file, folder],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSharedWithMe>)
    renderAt('/shared')

    expect(screen.getByTestId('file-list')).toHaveTextContent('showSharedBy:true')
    expect(screen.getByTestId('file-list')).toHaveTextContent('dateLabel:공유된 날짜')

    fireEvent.click(screen.getByRole('button', { name: 'enter folder' }))

    expect(useSharedDirectory).toHaveBeenLastCalledWith('d1')
    expect(screen.getByTestId('file-list')).toHaveTextContent('showSharedBy:true')
    expect(screen.getByTestId('file-list')).toHaveTextContent('dateLabel:공유된 날짜')
  })

  it('walks into the shared folder for a ?file= deep link to a file nested inside it, even under StrictMode', async () => {
    // Only the folder is a root-level share — the file itself is only reachable by walking in,
    // same as the public-share-link and 위치-link scenarios that land here with a nested fileId.
    // Rendered under StrictMode deliberately: its synchronous mount→cleanup→mount replay is what
    // exposed the real bug (a cleanup-driven `cancelled` flag discarding the one resolution that
    // actually ran).
    vi.mocked(useSharedWithMe).mockReturnValue({
      data: [folder],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSharedWithMe>)
    vi.mocked(listSharedWithMe).mockResolvedValue([folder])
    vi.mocked(getFile).mockResolvedValue({ ...file, path: '/폴더' })
    vi.mocked(listSharedDirectory).mockResolvedValue([{ ...file, path: '/폴더' }])
    vi.mocked(useSharedDirectory).mockImplementation(
      (fileId) =>
        ({
          data: fileId === 'd1' ? [{ ...file, path: '/폴더' }] : [],
          isLoading: false,
          isError: false,
        }) as unknown as ReturnType<typeof useSharedDirectory>,
    )

    renderAt('/shared?file=f1', true)

    expect(await screen.findByTestId('detail-panel')).toHaveTextContent('detail:f1')
    expect(screen.getByText('공유 문서함')).toBeInTheDocument()
    expect(screen.getByText('폴더')).toBeInTheDocument()
  })
})
