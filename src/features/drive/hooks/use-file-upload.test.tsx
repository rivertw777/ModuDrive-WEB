import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFileUpload } from './use-file-upload'
import type { BatchCreatedItem, BatchItem, ConflictResolution } from '../api/upload-file'
import type * as UploadFileModule from '../api/upload-file'
import type { UploadEntry } from '../utils/collect-upload-entries'

// The network calls are faked; batchConflicts stays real, since what opens the dialog is
// exactly "a 409 carrying conflicts" and nothing else.
vi.mock('../api/upload-file', async (importOriginal) => ({
  ...(await importOriginal<typeof UploadFileModule>()),
  createUploadBatch: vi.fn(),
  uploadBytes: vi.fn(),
}))

const { createUploadBatch, uploadBytes, MAX_FILE_SIZE } = await import('../api/upload-file')

type BatchCall = [string, BatchItem[], Record<string, ConflictResolution>]

const conflict = (...names: string[]) =>
  Object.assign(new Error('같은 이름의 파일이 이미 있습니다.'), { status: 409, data: { conflicts: names } })

const file = (name: string, content = 'x') => new File([content], name)
const entry = (relativePath: string, f: File | null = file(relativePath.split('/').pop() ?? '')) => ({
  relativePath,
  file: f,
})

/** Answers like the server would: every item created, fileId = "id:<relativePath>". */
function created(items: BatchItem[]): BatchCreatedItem[] {
  return items.map((item) => ({
    relativePath: item.relativePath,
    fileId: `id:${item.relativePath}`,
    name: item.relativePath.split('/').pop() ?? '',
    path: '/docs',
    directory: item.directory,
    replaced: false,
  }))
}

function renderUpload() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useFileUpload('/docs'), { wrapper })
}

async function upload(entries: UploadEntry[]) {
  const hook = renderUpload()
  await act(async () => {
    await hook.result.current.onUpload(entries)
  })
  return hook
}

const rows = (result: { current: ReturnType<typeof useFileUpload> }) =>
  result.current.uploads.map(({ name, directory, status, fileCount, doneCount, errorCount }) => ({
    name,
    directory,
    status,
    fileCount,
    doneCount,
    errorCount,
  }))

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.mocked(createUploadBatch).mockReset()
    vi.mocked(uploadBytes).mockReset()
    vi.mocked(uploadBytes).mockResolvedValue(undefined)
  })

  it('registers every picked file in one batch, then sends each file with its fileId', async () => {
    vi.mocked(createUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    const a = file('a.txt', 'aa')
    const b = file('b.txt', 'bbb')

    const { result } = await upload([entry('a.txt', a), entry('b.txt', b)])

    expect(createUploadBatch).toHaveBeenCalledTimes(1)
    expect(createUploadBatch).toHaveBeenCalledWith(
      '/docs',
      [
        { relativePath: 'a.txt', directory: false, size: 2 },
        { relativePath: 'b.txt', directory: false, size: 3 },
      ],
      {},
    )
    expect(vi.mocked(uploadBytes).mock.calls.map((call) => [call[0], call[1]])).toEqual([
      ['id:a.txt', a],
      ['id:b.txt', b],
    ])
    expect(rows(result).map((row) => [row.name, row.status])).toEqual([
      ['a.txt', 'done'],
      ['b.txt', 'done'],
    ])
    expect(result.current.uploadError).toBeNull()
  })

  it('shows a whole folder as one row and sends its empty folders in the batch', async () => {
    vi.mocked(createUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))

    const { result } = await upload([
      entry('사진', null),
      entry('사진/2024/a.jpg'),
      entry('사진/b.jpg'),
      entry('사진/빈폴더', null),
    ])

    const items = (vi.mocked(createUploadBatch).mock.calls[0] as BatchCall)[1]
    expect(items).toContainEqual({ relativePath: '사진/빈폴더', directory: true })
    expect(uploadBytes).toHaveBeenCalledTimes(2)
    expect(rows(result)).toEqual([
      { name: '사진', directory: true, status: 'done', fileCount: 2, doneCount: 2, errorCount: 0 },
    ])
  })

  it('asks about each conflicting file once, then retries the batch with the answers', async () => {
    vi.mocked(createUploadBatch).mockImplementation((_path, items, resolutions) =>
      Object.keys(resolutions).length === 0
        ? Promise.reject(conflict('a.txt', 'b.txt'))
        : Promise.resolve(created(items)),
    )
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload([entry('a.txt'), entry('b.txt')])
    })

    await waitFor(() => expect(result.current.conflictName).toBe('a.txt'))
    act(() => result.current.resolveConflict('replace'))
    await waitFor(() => expect(result.current.conflictName).toBe('b.txt'))
    act(() => result.current.resolveConflict('keep-both'))
    await act(async () => {
      await pending
    })

    expect(createUploadBatch).toHaveBeenCalledTimes(2)
    expect((vi.mocked(createUploadBatch).mock.calls[1] as BatchCall)[2]).toEqual({
      'a.txt': 'REPLACE',
      'b.txt': 'KEEP_BOTH',
    })
    expect(uploadBytes).toHaveBeenCalledTimes(2)
    expect(result.current.uploadError).toBeNull()
  })

  it('skips a cancelled conflict: its row goes away and the rest still upload', async () => {
    vi.mocked(createUploadBatch).mockImplementation((_path, items, resolutions) => {
      if (!('a.txt' in resolutions)) return Promise.reject(conflict('a.txt'))
      // The server leaves a SKIPped file out of the result.
      return Promise.resolve(created(items.filter((item) => resolutions[item.relativePath] !== 'SKIP')))
    })
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload([entry('a.txt'), entry('b.txt')])
    })

    await waitFor(() => expect(result.current.conflictName).toBe('a.txt'))
    act(() => result.current.resolveConflict(null))
    await act(async () => {
      await pending
    })

    expect((vi.mocked(createUploadBatch).mock.calls[1] as BatchCall)[2]).toEqual({ 'a.txt': 'SKIP' })
    expect(vi.mocked(uploadBytes).mock.calls.map((call) => call[0])).toEqual(['id:b.txt'])
    expect(rows(result).map((row) => row.name)).toEqual(['b.txt'])
  })

  it('fails only the file whose bytes failed and keeps sending the rest', async () => {
    vi.mocked(createUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    vi.mocked(uploadBytes).mockImplementation((fileId) =>
      fileId === 'id:사진/b.jpg' ? Promise.reject(new Error('서버 오류')) : Promise.resolve(),
    )

    const { result } = await upload([
      entry('사진/a.jpg'),
      entry('사진/b.jpg'),
      entry('사진/c.jpg'),
      entry('d.txt'),
    ])

    expect(uploadBytes).toHaveBeenCalledTimes(4)
    expect(rows(result)).toEqual([
      { name: '사진', directory: true, status: 'error', fileCount: 3, doneCount: 2, errorCount: 1 },
      { name: 'd.txt', directory: false, status: 'done', fileCount: 1, doneCount: 1, errorCount: 0 },
    ])
    expect(result.current.uploadError).toBeNull()
  })

  it('reports a batch failure other than a conflict without opening the dialog', async () => {
    vi.mocked(createUploadBatch).mockRejectedValue(
      Object.assign(new Error('업로드 항목의 경로나 크기가 올바르지 않습니다.'), { status: 400 }),
    )

    const { result } = await upload([entry('a.txt')])

    expect(result.current.conflictName).toBeNull()
    expect(result.current.uploadError).toBe('업로드 항목의 경로나 크기가 올바르지 않습니다.')
    expect(rows(result).map((row) => row.status)).toEqual(['error'])
    expect(uploadBytes).not.toHaveBeenCalled()
  })

  it('gives up instead of looping when the server keeps reporting names already answered', async () => {
    vi.mocked(createUploadBatch).mockRejectedValue(conflict('a.txt'))
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload([entry('a.txt')])
    })

    await waitFor(() => expect(result.current.conflictName).toBe('a.txt'))
    act(() => result.current.resolveConflict('replace'))
    await act(async () => {
      await pending
    })

    expect(createUploadBatch).toHaveBeenCalledTimes(2)
    expect(result.current.uploadError).toBe('같은 이름의 파일이 이미 있습니다.')
  })

  it('leaves an over-5GB file out of the batch and marks it failed', async () => {
    vi.mocked(createUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    const huge = file('huge.bin')
    Object.defineProperty(huge, 'size', { value: MAX_FILE_SIZE + 1 })

    const { result } = await upload([entry('huge.bin', huge), entry('small.txt')])

    expect((vi.mocked(createUploadBatch).mock.calls[0] as BatchCall)[1].map((item) => item.relativePath)).toEqual([
      'small.txt',
    ])
    expect(rows(result).map((row) => [row.name, row.status])).toEqual([
      ['huge.bin', 'error'],
      ['small.txt', 'done'],
    ])
    expect(result.current.uploads[0].errorReason).toBe('5GB 초과')
  })

  it('keeps an over-5GB file out of its folder’s byte total, so the percentage can reach 100', async () => {
    vi.mocked(createUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    const huge = file('huge.bin')
    Object.defineProperty(huge, 'size', { value: MAX_FILE_SIZE + 1 })

    const { result } = await upload([entry('폴더/huge.bin', huge), entry('폴더/a.txt', file('a.txt', 'abcd'))])

    const [row] = result.current.uploads
    expect(row.totalBytes).toBe(4)
    expect(row.sentBytes).toBe(4)
    expect(rows(result)).toEqual([
      { name: '폴더', directory: true, status: 'error', fileCount: 2, doneCount: 1, errorCount: 1 },
    ])
  })

  it('settles an empty folder as soon as the batch commits, without waiting for other files', async () => {
    vi.mocked(createUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    let release!: () => void
    vi.mocked(uploadBytes).mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)))
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload([entry('빈폴더', null), entry('big.bin')])
    })

    await waitFor(() => expect(uploadBytes).toHaveBeenCalledTimes(1))
    expect(rows(result).map((row) => [row.name, row.status])).toEqual([
      ['빈폴더', 'done'],
      ['big.bin', 'uploading'],
    ])
    await act(async () => {
      release()
      await pending
    })
  })

  it('asks again only about names that are new in a repeated 409', async () => {
    vi.mocked(createUploadBatch)
      .mockRejectedValueOnce(conflict('a.txt'))
      .mockRejectedValueOnce(conflict('a.txt', 'b.txt'))
      .mockImplementation((_path, items) => Promise.resolve(created(items)))
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload([entry('a.txt'), entry('b.txt')])
    })

    await waitFor(() => expect(result.current.conflictName).toBe('a.txt'))
    act(() => result.current.resolveConflict('replace'))
    await waitFor(() => expect(result.current.conflictName).toBe('b.txt'))
    act(() => result.current.resolveConflict('keep-both'))
    await act(async () => {
      await pending
    })

    expect(createUploadBatch).toHaveBeenCalledTimes(3)
    expect((vi.mocked(createUploadBatch).mock.calls[2] as BatchCall)[2]).toEqual({
      'a.txt': 'REPLACE',
      'b.txt': 'KEEP_BOTH',
    })
  })

  it('names the row after where it landed when the server numbered it', async () => {
    // The server also returns the implicit parent folder, under its numbered name.
    vi.mocked(createUploadBatch).mockImplementation((_path, items) =>
      Promise.resolve([
        { relativePath: '사진', fileId: 'id:사진', name: '사진 (1)', path: '/docs', directory: true, replaced: false },
        ...created(items),
      ]),
    )

    const { result } = await upload([entry('사진/a.jpg')])

    expect(rows(result).map((row) => row.name)).toEqual(['사진 (1)'])
  })

  it('runs a second pick only after the first has finished', async () => {
    vi.mocked(createUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    let releaseFirst!: () => void
    vi.mocked(uploadBytes).mockImplementationOnce(
      () => new Promise<void>((resolve) => (releaseFirst = resolve)),
    )
    const { result } = renderUpload()
    let first!: Promise<void>
    let second!: Promise<void>
    act(() => {
      first = result.current.onUpload([entry('a.txt')])
      second = result.current.onUpload([entry('b.txt')])
    })

    await waitFor(() => expect(uploadBytes).toHaveBeenCalledTimes(1))
    expect(createUploadBatch).toHaveBeenCalledTimes(1)
    // The waiting pick is already in the panel, so it doesn't look like nothing happened.
    expect(rows(result).map((row) => row.name)).toEqual(['a.txt', 'b.txt'])
    await act(async () => {
      releaseFirst()
      await first
      await second
    })

    expect(createUploadBatch).toHaveBeenCalledTimes(2)
    expect(vi.mocked(uploadBytes).mock.calls.map((call) => call[0])).toEqual(['id:a.txt', 'id:b.txt'])
  })

  it('refuses more than 5,000 items without creating anything', async () => {
    const entries = Array.from({ length: 5001 }, (_, i) => entry(`폴더/f${i}.txt`))

    const { result } = await upload(entries)

    expect(result.current.uploadError).toBe('한 번에 5,000개까지 올릴 수 있습니다.')
    expect(result.current.uploads).toEqual([])
    expect(createUploadBatch).not.toHaveBeenCalled()
  })
})
