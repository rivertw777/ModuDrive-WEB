import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFileUpload } from './use-file-upload'
import type { UploadFileInput } from '../api/upload-file'
import type * as UploadFileModule from '../api/upload-file'

// Only the mutation hook is faked — isNameConflictError stays real, since the whole point
// of these tests is that a 400 (and nothing else) opens the conflict dialog.
vi.mock('../api/upload-file', async (importOriginal) => ({
  ...(await importOriginal<typeof UploadFileModule>()),
  useUploadFile: vi.fn(),
}))

const { useUploadFile } = await import('../api/upload-file')

const conflict = () =>
  Object.assign(new Error('같은 위치에 같은 이름의 항목이 이미 존재합니다.'), { nameConflict: true })

let mutateAsync: ReturnType<typeof vi.fn>

function mockUpload(impl: (input: UploadFileInput) => Promise<unknown>) {
  mutateAsync = vi.fn(impl)
  vi.mocked(useUploadFile).mockReturnValue({ mutateAsync } as unknown as ReturnType<
    typeof useUploadFile
  >)
}

const fileA = new File(['a'], 'a.txt')
const fileB = new File(['b'], 'b.txt')

/** Starts the batch and waits for it to pause on `a.txt`'s conflict dialog. */
async function startAndAwaitConflict(files: File[] = [fileA, fileB]) {
  const hook = renderHook(() => useFileUpload('/docs'))
  let pending!: Promise<void>
  act(() => {
    pending = hook.result.current.onFilesSelected(files)
  })
  await waitFor(() => expect(hook.result.current.conflictName).toBe('a.txt'))
  return { ...hook, pending }
}

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.mocked(useUploadFile).mockReset()
  })

  it('uploads a batch under the original names with no dialog when nothing collides', async () => {
    mockUpload(() => Promise.resolve(null))
    const { result } = renderHook(() => useFileUpload('/docs'))

    await act(async () => {
      await result.current.onFilesSelected([fileA, fileB])
    })

    expect(mutateAsync).toHaveBeenCalledTimes(2)
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ file: fileA, path: '/docs' })
    expect(mutateAsync.mock.calls[0][0].replaceExisting).toBeUndefined()
    expect(result.current.conflictName).toBeNull()
    expect(result.current.uploadError).toBeNull()
  })

  it('surfaces only the colliding file and retries it with replaceExisting', async () => {
    mockUpload((input) => (input.replaceExisting ? Promise.resolve(null) : Promise.reject(conflict())))
    const { result, pending } = await startAndAwaitConflict([fileA])

    act(() => result.current.resolveConflict('replace'))
    await act(async () => {
      await pending
    })

    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ file: fileA, path: '/docs', replaceExisting: true }),
    )
    expect(result.current.conflictName).toBeNull()
    expect(result.current.uploadError).toBeNull()
  })

  it('keeps both by numbering up until a free name is found', async () => {
    const taken = new Set(['a.txt', 'a (1).txt'])
    mockUpload((input) =>
      taken.has(input.name ?? input.file.name) ? Promise.reject(conflict()) : Promise.resolve(null),
    )
    const { result, pending } = await startAndAwaitConflict([fileA])

    act(() => result.current.resolveConflict('keep-both'))
    await act(async () => {
      await pending
    })

    expect(mutateAsync.mock.calls.map((call) => call[0].name)).toEqual([
      undefined,
      'a (1).txt',
      'a (2).txt',
    ])
    expect(result.current.uploadError).toBeNull()
  })

  it('skips just the cancelled file and still uploads the rest of the batch', async () => {
    mockUpload((input) => (input.file === fileA ? Promise.reject(conflict()) : Promise.resolve(null)))
    const { result, pending } = await startAndAwaitConflict()

    act(() => result.current.resolveConflict(null))
    await act(async () => {
      await pending
    })

    expect(mutateAsync).toHaveBeenCalledTimes(2) // a.txt (failed), then b.txt — no retry of a.txt
    expect(mutateAsync.mock.calls[1][0]).toMatchObject({ file: fileB })
    expect(result.current.uploadError).toBeNull()
  })

  it('reports a non-conflict failure as an error instead of opening the dialog', async () => {
    mockUpload(() => Promise.reject(new Error('업로드 서버 오류')))
    const { result } = renderHook(() => useFileUpload('/docs'))

    await act(async () => {
      await result.current.onFilesSelected([fileA])
    })

    expect(result.current.conflictName).toBeNull()
    expect(result.current.uploadError).toBe('업로드 서버 오류')
  })

  it('marks the rest of the batch as error instead of leaving it stuck uploading', async () => {
    mockUpload((input) => (input.file === fileA ? Promise.reject(new Error('서버 오류')) : Promise.resolve(null)))
    const { result } = renderHook(() => useFileUpload('/docs'))

    await act(async () => {
      await result.current.onFilesSelected([fileA, fileB])
    })

    expect(result.current.uploads.map((u) => ({ name: u.name, status: u.status }))).toEqual([
      { name: 'a.txt', status: 'error' },
      { name: 'b.txt', status: 'error' },
    ])
  })
})
