import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFileUpload } from './use-file-upload'
import type { BatchItem, BatchPlannedItem, ConflictResolution } from '../api/upload-file'
import type * as UploadFileModule from '../api/upload-file'
import type { UploadEntry } from '../utils/collect-upload-entries'

// The network calls are faked; batchConflicts stays real, since what opens the dialog is
// exactly "a 409 carrying conflicts" and nothing else.
vi.mock('../api/upload-file', async (importOriginal) => ({
  ...(await importOriginal<typeof UploadFileModule>()),
  planUploadBatch: vi.fn(),
  uploadGroup: vi.fn(),
  commitFolders: vi.fn(),
}))
vi.mock('../utils/hash-in-worker', () => ({ hashFile: vi.fn() }))

const { planUploadBatch, uploadGroup, commitFolders, MAX_FILE_SIZE } = await import('../api/upload-file')
const { hashFile } = await import('../utils/hash-in-worker')

type BatchCall = [string, BatchItem[], Record<string, ConflictResolution>]

const conflict = (...names: string[]) =>
  Object.assign(new Error('같은 이름의 파일이 이미 있습니다.'), { status: 409, data: { conflicts: names } })

const file = (name: string, content = 'x') => new File([content], name)
const entry = (relativePath: string, f: File | null = file(relativePath.split('/').pop() ?? '')) => ({
  relativePath,
  file: f,
})

/** Answers like the server would: every item lands at its own path under /docs, nothing replaced,
 * with the folders above each item listed first even when the request never named them. */
function created(items: BatchItem[]): BatchPlannedItem[] {
  const planned = new Map<string, BatchPlannedItem>()
  for (const item of items) {
    const segments = item.relativePath.split('/')
    segments.forEach((name, depth) => {
      const relativePath = segments.slice(0, depth + 1).join('/')
      if (planned.has(relativePath)) return
      planned.set(relativePath, {
        relativePath,
        fileId: null,
        name,
        path: ['/docs', ...segments.slice(0, depth)].join('/'),
        directory: depth < segments.length - 1 || item.directory,
        replaced: false,
      })
    })
  }
  return [...planned.values()]
}

/** [path, name] of every committed file, in order. */
const committedTargets = () => vi.mocked(uploadGroup).mock.calls.flatMap(([targets]) => targets)
const commits = () => committedTargets().map((target) => [target.path, target.name])
/** [path, name] of every folder committed, in order. */
const folderCommits = () =>
  vi.mocked(commitFolders).mock.calls.flatMap(([folders]) => folders.map(({ path, name }) => [path, name]))
/** Every file committed fine, or failed with `fail(name)`'s error. */
const outcomesFor = (fail: (name: string) => Error | null = () => null) =>
  vi.mocked(uploadGroup).mockImplementation((targets) => Promise.resolve(targets.map((target) => fail(target.name))))

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
    vi.mocked(planUploadBatch).mockReset()
    vi.mocked(uploadGroup).mockReset()
    outcomesFor()
    vi.mocked(hashFile).mockReset()
    vi.mocked(hashFile).mockResolvedValue([])
    vi.mocked(commitFolders).mockReset()
    vi.mocked(commitFolders).mockImplementation((folders) => Promise.resolve(folders.map(() => ({ fileId: 'f' }))))
  })

  it('checks every picked file in one batch, then commits each file where the batch said', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    const a = file('a.txt', 'aa')
    const b = file('b.txt', 'bbb')

    const { result } = await upload([entry('a.txt', a), entry('b.txt', b)])

    expect(planUploadBatch).toHaveBeenCalledTimes(1)
    expect(planUploadBatch).toHaveBeenCalledWith(
      '/docs',
      [
        { relativePath: 'a.txt', directory: false, size: 2 },
        { relativePath: 'b.txt', directory: false, size: 3 },
      ],
      {},
    )
    expect(committedTargets().map((target) => [target.path, target.name, target.file])).toEqual([
      ['/docs', 'a.txt', a],
      ['/docs', 'b.txt', b],
    ])
    expect(commitFolders).not.toHaveBeenCalled()
    expect(rows(result).map((row) => [row.name, row.status])).toEqual([
      ['a.txt', 'done'],
      ['b.txt', 'done'],
    ])
    expect(result.current.uploadError).toBeNull()
  })

  it('shows a whole folder as one row and creates only the folders no commit made', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))

    const { result } = await upload([
      entry('사진', null),
      entry('사진/2024/a.jpg'),
      entry('사진/b.jpg'),
      entry('사진/빈폴더', null),
    ])

    const items = (vi.mocked(planUploadBatch).mock.calls[0] as BatchCall)[1]
    expect(items).toContainEqual({ relativePath: '사진/빈폴더', directory: true })
    expect(commits()).toHaveLength(2)
    // 사진 and 사진/2024 came with the files' commits.
    expect(folderCommits()).toEqual([['/docs/사진', '빈폴더']])
    expect(rows(result)).toEqual([
      { name: '사진', directory: true, status: 'done', fileCount: 2, doneCount: 2, errorCount: 0 },
    ])
  })

  it('asks about each conflicting file once, then retries the batch with the answers', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items, resolutions) =>
      Object.keys(resolutions).length === 0
        ? Promise.reject(conflict('a.txt', 'b.txt'))
        : Promise.resolve(created(items)),
    )
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload([entry('a.txt'), entry('b.txt')])
    })

    await waitFor(() => expect(result.current.conflict?.name).toBe('a.txt'))
    act(() => result.current.resolveConflict('replace'))
    await waitFor(() => expect(result.current.conflict?.name).toBe('b.txt'))
    act(() => result.current.resolveConflict('keep-both'))
    await act(async () => {
      await pending
    })

    expect(planUploadBatch).toHaveBeenCalledTimes(2)
    expect((vi.mocked(planUploadBatch).mock.calls[1] as BatchCall)[2]).toEqual({
      'a.txt': 'REPLACE',
      'b.txt': 'KEEP_BOTH',
    })
    expect(commits()).toHaveLength(2)
    expect(result.current.uploadError).toBeNull()
  })

  it('skips a cancelled conflict: its row goes away and the rest still upload', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items, resolutions) => {
      if (!('a.txt' in resolutions)) return Promise.reject(conflict('a.txt'))
      // The server leaves a SKIPped file out of the result.
      return Promise.resolve(created(items.filter((item) => resolutions[item.relativePath] !== 'SKIP')))
    })
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload([entry('a.txt'), entry('b.txt')])
    })

    await waitFor(() => expect(result.current.conflict?.name).toBe('a.txt'))
    act(() => result.current.resolveConflict(null))
    await act(async () => {
      await pending
    })

    expect((vi.mocked(planUploadBatch).mock.calls[1] as BatchCall)[2]).toEqual({ 'a.txt': 'SKIP' })
    expect(commits()).toEqual([['/docs', 'b.txt']])
    expect(rows(result).map((row) => row.name)).toEqual(['b.txt'])
  })

  it('asks about a clashing folder as a folder, and a cancel drops its whole row', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items, resolutions) => {
      if (!('사진' in resolutions)) return Promise.reject(conflict('사진'))
      return Promise.resolve(created(items.filter((item) => !item.relativePath.startsWith('사진'))))
    })
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload([entry('사진/a.jpg'), entry('b.txt')])
    })

    await waitFor(() => expect(result.current.conflict).toEqual({ name: '사진', directory: true }))
    act(() => result.current.resolveConflict(null))
    await act(async () => {
      await pending
    })

    expect((vi.mocked(planUploadBatch).mock.calls[1] as BatchCall)[2]).toEqual({ 사진: 'SKIP' })
    expect(rows(result).map((row) => row.name)).toEqual(['b.txt'])
  })

  it('fails only the file that failed and keeps the rest', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    outcomesFor((name) => (name === 'b.jpg' ? new Error('서버 오류') : null))

    const { result } = await upload([
      entry('사진/a.jpg'),
      entry('사진/b.jpg'),
      entry('사진/c.jpg'),
      entry('d.txt'),
    ])

    expect(commits()).toHaveLength(4)
    expect(rows(result)).toEqual([
      { name: '사진', directory: true, status: 'error', fileCount: 3, doneCount: 2, errorCount: 1 },
      { name: 'd.txt', directory: false, status: 'done', fileCount: 1, doneCount: 1, errorCount: 0 },
    ])
    expect(result.current.uploadError).toBeNull()
  })

  it('reports a batch failure other than a conflict without opening the dialog', async () => {
    vi.mocked(planUploadBatch).mockRejectedValue(
      Object.assign(new Error('업로드 항목의 경로나 크기가 올바르지 않습니다.'), { status: 400 }),
    )

    const { result } = await upload([entry('a.txt')])

    expect(result.current.conflict).toBeNull()
    expect(result.current.uploadError).toBe('업로드 항목의 경로나 크기가 올바르지 않습니다.')
    expect(rows(result).map((row) => row.status)).toEqual(['error'])
    expect(uploadGroup).not.toHaveBeenCalled()
  })

  it('gives up instead of looping when the server keeps reporting names already answered', async () => {
    vi.mocked(planUploadBatch).mockRejectedValue(conflict('a.txt'))
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload([entry('a.txt')])
    })

    await waitFor(() => expect(result.current.conflict?.name).toBe('a.txt'))
    act(() => result.current.resolveConflict('replace'))
    await act(async () => {
      await pending
    })

    expect(planUploadBatch).toHaveBeenCalledTimes(2)
    expect(result.current.uploadError).toBe('같은 이름의 파일이 이미 있습니다.')
  })

  it('leaves an over-5GB file out of the batch and marks it failed', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    const huge = file('huge.bin')
    Object.defineProperty(huge, 'size', { value: MAX_FILE_SIZE + 1 })

    const { result } = await upload([entry('huge.bin', huge), entry('small.txt')])

    expect((vi.mocked(planUploadBatch).mock.calls[0] as BatchCall)[1].map((item) => item.relativePath)).toEqual([
      'small.txt',
    ])
    expect(rows(result).map((row) => [row.name, row.status])).toEqual([
      ['huge.bin', 'error'],
      ['small.txt', 'done'],
    ])
    expect(result.current.uploads[0].errorReason).toBe('5GB 초과')
  })

  it('keeps an over-5GB file out of its folder’s byte total, so the percentage can reach 100', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
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

  it('creates an empty folder after the files, and a folder whose files all failed', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    outcomesFor(() => new Error('서버 오류'))

    const { result } = await upload([entry('빈폴더', null), entry('실패/a.txt')])

    expect(folderCommits()).toEqual([
      ['/docs', '빈폴더'],
      ['/docs', '실패'],
    ])
    expect(rows(result).map((row) => [row.name, row.status])).toEqual([
      ['빈폴더', 'done'],
      ['실패', 'error'],
    ])
  })

  it('commits all remaining folders in one request and fails only the ones the server rejected', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    vi.mocked(commitFolders).mockResolvedValueOnce([{ error: { status: 400, message: '이름 오류' } }, { fileId: 'b' }])

    const { result } = await upload([entry('a', null), entry('a/b', null)])

    expect(commitFolders).toHaveBeenCalledTimes(1)
    expect(folderCommits()).toEqual([
      ['/docs', 'a'],
      ['/docs/a', 'b'],
    ])
    expect(rows(result)).toEqual([
      { name: 'a', directory: true, status: 'error', fileCount: 0, doneCount: 0, errorCount: 1 },
    ])
  })

  it('does not create a folder a replace merges into', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) =>
      Promise.resolve(
        created(items).map((item) => (item.relativePath === '사진' ? { ...item, fileId: 'old', replaced: true } : item)),
      ),
    )

    await upload([entry('사진', null), entry('사진/빈폴더', null)])

    expect(folderCommits()).toEqual([['/docs/사진', '빈폴더']])
  })

  it('asks again only about names that are new in a repeated 409', async () => {
    vi.mocked(planUploadBatch)
      .mockRejectedValueOnce(conflict('a.txt'))
      .mockRejectedValueOnce(conflict('a.txt', 'b.txt'))
      .mockImplementation((_path, items) => Promise.resolve(created(items)))
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload([entry('a.txt'), entry('b.txt')])
    })

    await waitFor(() => expect(result.current.conflict?.name).toBe('a.txt'))
    act(() => result.current.resolveConflict('replace'))
    await waitFor(() => expect(result.current.conflict?.name).toBe('b.txt'))
    act(() => result.current.resolveConflict('keep-both'))
    await act(async () => {
      await pending
    })

    expect(planUploadBatch).toHaveBeenCalledTimes(3)
    expect((vi.mocked(planUploadBatch).mock.calls[2] as BatchCall)[2]).toEqual({
      'a.txt': 'REPLACE',
      'b.txt': 'KEEP_BOTH',
    })
  })

  it('names the row after where it landed when the server numbered it', async () => {
    // The server also returns the implicit parent folder, under its numbered name.
    vi.mocked(planUploadBatch).mockImplementation((_path, items) =>
      Promise.resolve(
        created(items).map((item) =>
          item.relativePath === '사진'
            ? { ...item, name: '사진 (1)' }
            : { ...item, path: item.path.replace('/docs/사진', '/docs/사진 (1)') },
        ),
      ),
    )

    const { result } = await upload([entry('사진/a.jpg')])

    expect(rows(result).map((row) => row.name)).toEqual(['사진 (1)'])
  })

  it('runs a second pick only after the first has finished', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    let releaseFirst!: () => void
    vi.mocked(uploadGroup).mockImplementationOnce(
      (targets) => new Promise((resolve) => (releaseFirst = () => resolve(targets.map(() => null)))),
    )
    const { result } = renderUpload()
    let first!: Promise<void>
    let second!: Promise<void>
    act(() => {
      first = result.current.onUpload([entry('a.txt')])
      second = result.current.onUpload([entry('b.txt')])
    })

    await waitFor(() => expect(uploadGroup).toHaveBeenCalledTimes(1))
    expect(planUploadBatch).toHaveBeenCalledTimes(1)
    // The waiting pick is already in the panel, so it doesn't look like nothing happened.
    expect(rows(result).map((row) => row.name)).toEqual(['a.txt', 'b.txt'])
    await act(async () => {
      releaseFirst()
      await first
      await second
    })

    expect(planUploadBatch).toHaveBeenCalledTimes(2)
    expect(commits()).toEqual([
      ['/docs', 'a.txt'],
      ['/docs', 'b.txt'],
    ])
  })

  it('commits files a group of 100 at a time and adds each group to its row', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    const entries = Array.from({ length: 150 }, (_, i) => entry(`폴더/f${i}.txt`))

    const { result } = await upload(entries)

    expect(vi.mocked(uploadGroup).mock.calls.map(([targets]) => targets.length)).toEqual([100, 50])
    expect(rows(result)).toEqual([
      { name: '폴더', directory: true, status: 'done', fileCount: 150, doneCount: 150, errorCount: 0 },
    ])
    expect(result.current.uploads[0].sentBytes).toBe(150)
  })

  it('starts hashing every file the moment they are picked, before the batch check answers', async () => {
    let answerBatch!: () => void
    vi.mocked(planUploadBatch).mockImplementation(
      (_path, items) => new Promise((resolve) => (answerBatch = () => resolve(created(items)))),
    )
    const { result } = renderUpload()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.onUpload(Array.from({ length: 150 }, (_, i) => entry(`폴더/f${i}.txt`)))
    })

    await waitFor(() => expect(planUploadBatch).toHaveBeenCalledTimes(1))
    expect(hashFile).toHaveBeenCalledTimes(150)
    expect(uploadGroup).not.toHaveBeenCalled()
    await act(async () => {
      answerBatch()
      await pending
    })
    expect(vi.mocked(uploadGroup).mock.calls.map(([targets]) => targets.length)).toEqual([100, 50])
  })

  it('fails only the file that cannot be read, and sends the rest of its group', async () => {
    vi.mocked(planUploadBatch).mockImplementation((_path, items) => Promise.resolve(created(items)))
    vi.mocked(hashFile).mockRejectedValueOnce(new Error('파일을 읽을 수 없습니다.'))

    const { result } = await upload(Array.from({ length: 150 }, (_, i) => entry(`폴더/f${i}.txt`)))

    expect(vi.mocked(uploadGroup).mock.calls.map(([targets]) => targets.length)).toEqual([99, 50])
    expect(committedTargets().map((target) => target.name)).not.toContain('f0.txt')
    expect(rows(result)).toEqual([
      { name: '폴더', directory: true, status: 'error', fileCount: 150, doneCount: 149, errorCount: 1 },
    ])
  })

  it('refuses more than 5,000 items without creating anything', async () => {
    const entries = Array.from({ length: 5001 }, (_, i) => entry(`폴더/f${i}.txt`))

    const { result } = await upload(entries)

    expect(result.current.uploadError).toBe('한 번에 5,000개까지 올릴 수 있습니다.')
    expect(result.current.uploads).toEqual([])
    expect(planUploadBatch).not.toHaveBeenCalled()
  })
})
