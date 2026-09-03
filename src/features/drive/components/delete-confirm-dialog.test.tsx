import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import type { FileAccessList } from '../types'

vi.mock('../api/list-file-shares', () => ({ listFileShares: vi.fn() }))
vi.mock('../api/delete-file', () => ({ useDeleteFile: vi.fn() }))

const { listFileShares } = await import('../api/list-file-shares')
const { useDeleteFile } = await import('../api/delete-file')

const emptyAccess: FileAccessList = {
  fileId: 'f1',
  ownerId: 'owner-1',
  scope: 'RESTRICTED',
  role: null,
  linkToken: null,
  shares: [],
  inheritedLinks: [],
}

function renderDialog(files: { fileId: string; name: string; directory?: boolean }[]) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DeleteConfirmDialog open files={files} onClose={vi.fn()} onDeleted={vi.fn()} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(useDeleteFile).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useDeleteFile>)
})

describe('DeleteConfirmDialog', () => {
  it('warns when a target is currently shared', async () => {
    vi.mocked(listFileShares).mockResolvedValue({
      ...emptyAccess,
      shares: [
        {
          shareId: 's1',
          fileId: 'f1',
          ownerId: 'owner-1',
          sharedWithUserId: 'm1',
          role: 'VIEWER',
          sharedWithEmail: 'a@b.com',
          sharedWithName: 'a',
          inheritedFrom: null,
        },
      ],
    })

    renderDialog([{ fileId: 'f1', name: 'report.pdf' }])

    expect(await screen.findByText(/현재 공유 중/)).toBeInTheDocument()
  })

  it('shows no share warning when nothing is shared', async () => {
    vi.mocked(listFileShares).mockResolvedValue(emptyAccess)

    renderDialog([{ fileId: 'f1', name: 'report.pdf' }])

    expect(await screen.findByText(/휴지통에서 복원할 수 있습니다/)).toBeInTheDocument()
    expect(screen.queryByText(/현재 공유 중/)).not.toBeInTheDocument()
  })
})
