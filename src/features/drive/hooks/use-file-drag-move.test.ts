import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DRAG_MIME, type FileEntry } from '@/types/file'
import { useFileDragMove } from './use-file-drag-move'

vi.mock('../api/move-file', () => ({ useMoveFile: vi.fn() }))

const { useMoveFile } = await import('../api/move-file')
const mutateAsync = vi.fn()

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(undefined)
  vi.mocked(useMoveFile).mockReturnValue({ mutateAsync } as unknown as ReturnType<
    typeof useMoveFile
  >)
})

const entry = (name: string, path: string, directory = false): FileEntry => ({
  fileId: name,
  namespaceId: 'ns',
  name,
  path,
  ownerId: 'owner',
  currentVersionId: null,
  fileSize: 10,
  status: 'UPLOADED',
  directory,
  favorite: false,
  category: 'OTHER',
  updatedAt: null,
})

const dropEvent = (ids: string[]) =>
  ({
    preventDefault: vi.fn(),
    dataTransfer: { getData: (type: string) => (type === DRAG_MIME ? JSON.stringify(ids) : '') },
  }) as unknown as React.DragEvent

function setup(files: FileEntry[]) {
  const setSelected = vi.fn()
  const setActionError = vi.fn()
  const { result } = renderHook(() =>
    useFileDragMove({ files, selected: new Set(), setSelected, setActionError }),
  )
  return { result, setSelected }
}

describe('useFileDragMove', () => {
  it('moves dropped files into the target folder', async () => {
    const docs = entry('docs', '/', true)
    const { result, setSelected } = setup([docs, entry('a.txt', '/')])

    await act(() => result.current.dragHandlers(docs).onDrop?.(dropEvent(['a.txt'])))

    expect(mutateAsync).toHaveBeenCalledWith({ fileId: 'a.txt', path: '/docs' })
    expect(setSelected).toHaveBeenCalledWith(new Set())
  })

  it('refuses the whole drop when the target is one of the dragged items', async () => {
    const docs = entry('docs', '/', true)
    const { result } = setup([docs, entry('a.txt', '/')])

    await act(() => result.current.dragHandlers(docs).onDrop?.(dropEvent(['a.txt', 'docs'])))

    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('skips a folder dropped into its own subfolder', async () => {
    const parent = entry('parent', '/', true)
    const child = entry('child', '/parent', true)
    const { result } = setup([parent, child, entry('a.txt', '/')])

    await act(() => result.current.dragHandlers(child).onDrop?.(dropEvent(['parent', 'a.txt'])))

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutateAsync).toHaveBeenCalledWith({ fileId: 'a.txt', path: '/parent/child' })
  })

  it('only lets folder rows accept a drop', () => {
    const { result } = setup([entry('a.txt', '/')])

    expect(result.current.dragHandlers(entry('a.txt', '/')).onDrop).toBeUndefined()
  })
})
