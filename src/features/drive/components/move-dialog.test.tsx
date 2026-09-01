import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MoveDialog } from './move-dialog'
import type { FileEntry } from '../types'

vi.mock('../api/move-file', () => ({ useMoveFile: vi.fn() }))
vi.mock('../api/create-directory', () => ({ useCreateDirectory: vi.fn() }))
vi.mock('../api/list-directory', () => ({ useDirectoryListing: vi.fn() }))

const { useMoveFile } = await import('../api/move-file')
const { useCreateDirectory } = await import('../api/create-directory')
const { useDirectoryListing } = await import('../api/list-directory')

const folder: FileEntry = {
  fileId: 'folder-1',
  namespaceId: 'ns',
  name: '사진',
  path: '/',
  ownerId: 'owner',
  currentVersionId: null,
  fileSize: null,
  status: 'UPLOADED',
  directory: true,
  favorite: false,
  category: 'OTHER',
  updatedAt: null,
}

const movingFolder: FileEntry = { ...folder, fileId: 'folder-2', name: '문서' }

function setup(entries: FileEntry[], files = [{ ...folder, fileId: 'file-1', name: 'a.txt', directory: false }]) {
  vi.mocked(useDirectoryListing).mockReturnValue({
    data: entries,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useDirectoryListing>)
  vi.mocked(useMoveFile).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useMoveFile>)
  vi.mocked(useCreateDirectory).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useCreateDirectory>)
  const onClose = vi.fn()
  render(<MoveDialog open onClose={onClose} files={files} />)
  return { onClose }
}

describe('MoveDialog', () => {
  it('lists sub-folders of the current browse path and lets the user drill in', async () => {
    setup([folder])
    expect(screen.getByText('사진')).toBeInTheDocument()
    await userEvent.click(screen.getByText('사진'))
    expect(useDirectoryListing).toHaveBeenLastCalledWith('/사진')
  })

  it('excludes a folder being moved from the destination list (no moving into itself)', () => {
    setup([folder, movingFolder], [movingFolder])
    expect(screen.getByRole('button', { name: /사진/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /문서/ })).not.toBeInTheDocument()
  })
})
