import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileList, type ServerPagination } from './file-list'
import type { FileEntry } from '../types'

vi.mock('../api/toggle-favorite', () => ({ useToggleFavorite: vi.fn() }))
vi.mock('../api/move-file', () => ({ useMoveFile: vi.fn() }))
vi.mock('../api/download-file', () => ({ downloadFile: vi.fn() }))
vi.mock('../api/download-archive', () => ({
  downloadArchive: vi.fn(() => Promise.resolve()),
  alertDownloadFailure: vi.fn(),
}))

const { useToggleFavorite } = await import('../api/toggle-favorite')
const { useMoveFile } = await import('../api/move-file')
const { downloadFile } = await import('../api/download-file')
const { downloadArchive } = await import('../api/download-archive')

beforeEach(() => {
  vi.mocked(downloadFile).mockClear()
  vi.mocked(downloadArchive).mockClear()
  vi.mocked(useToggleFavorite).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<
    typeof useToggleFavorite
  >)
  vi.mocked(useMoveFile).mockReturnValue({ mutateAsync: vi.fn() } as unknown as ReturnType<
    typeof useMoveFile
  >)
})

const entry = (name: string, over: Partial<FileEntry> = {}): FileEntry => ({
  fileId: name,
  namespaceId: 'ns',
  name,
  path: '/',
  ownerId: 'owner',
  currentVersionId: null,
  fileSize: 10,
  status: 'UPLOADED',
  directory: false,
  favorite: false,
  category: 'OTHER',
  updatedAt: '2026-09-01T00:00:00',
  ...over,
})

function renderList(server: Partial<ServerPagination>, files = [entry('z.txt'), entry('a.txt')]) {
  const serverPagination: ServerPagination = {
    hasMore: false,
    isLoadingMore: false,
    onLoadMore: vi.fn(),
    sortField: 'name',
    sortDir: 'asc',
    onSortChange: vi.fn(),
    ...server,
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <FileList
          files={files}
          selectedFileId={null}
          onNavigate={vi.fn()}
          onSelect={vi.fn()}
          serverPagination={serverPagination}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return serverPagination
}

describe('FileList server pagination mode', () => {
  it('renders rows in the order given, without re-sorting client-side', () => {
    renderList({})
    const cells = screen.getAllByRole('cell').map((c) => c.textContent)
    // z.txt before a.txt — server order is preserved, sortFiles() is not applied
    expect(cells.filter((t) => t === 'z.txt' || t === 'a.txt')).toEqual(['z.txt', 'a.txt'])
  })

  it('routes a sort-header click to onSortChange instead of sorting locally', async () => {
    const server = renderList({})
    await userEvent.click(screen.getByRole('button', { name: /이름/ }))
    expect(server.onSortChange).toHaveBeenCalledWith('name')
  })

  it('shows the loading-more indicator while the next page is fetching', () => {
    renderList({ hasMore: true, isLoadingMore: true })
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })
})

describe('FileList download', () => {
  const files = [entry('a.txt'), entry('photos', { directory: true, fileSize: null })]

  it('downloads a single plain file as itself', async () => {
    renderList({}, files)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('a.txt') })
    await userEvent.click(screen.getByRole('button', { name: '다운로드' }))
    expect(downloadFile).toHaveBeenCalledWith('a.txt', 'a.txt')
    expect(downloadArchive).not.toHaveBeenCalled()
  })

  it('offers download on a folder and fetches it as a zip', async () => {
    renderList({}, files)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('photos') })
    await userEvent.click(screen.getByRole('button', { name: '다운로드' }))
    expect(downloadArchive).toHaveBeenCalledWith(['photos'])
  })

  it('zips a multi-selection of files and folders together', async () => {
    renderList({}, files)
    // One instance so the held Control carries over to the next click.
    const user = userEvent.setup()
    await user.click(screen.getByText('a.txt'))
    await user.keyboard('{Control>}')
    await user.click(screen.getByText('photos'))
    await user.keyboard('{/Control}')
    await user.pointer({ keys: '[MouseRight]', target: screen.getByText('photos') })
    await user.click(screen.getByRole('button', { name: '다운로드 (2개)' }))
    expect(downloadArchive).toHaveBeenCalledWith(expect.arrayContaining(['a.txt', 'photos']))
    expect(downloadFile).not.toHaveBeenCalled()
  })
})
