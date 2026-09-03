import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileList, type ServerPagination } from './file-list'
import type { FileEntry } from '../types'

vi.mock('../api/toggle-favorite', () => ({ useToggleFavorite: vi.fn() }))
vi.mock('../api/move-file', () => ({ useMoveFile: vi.fn() }))

const { useToggleFavorite } = await import('../api/toggle-favorite')
const { useMoveFile } = await import('../api/move-file')

beforeEach(() => {
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
      <FileList
        files={files}
        selectedFileId={null}
        onNavigate={vi.fn()}
        onSelect={vi.fn()}
        serverPagination={serverPagination}
      />
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
