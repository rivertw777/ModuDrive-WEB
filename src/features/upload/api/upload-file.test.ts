import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ apiClient: api }))

import { commitFolders, groupForCommit, uploadGroup, type UploadTarget } from './upload-file'
import { hashFile } from '../utils/hash-in-worker'

const MB = 1024 * 1024

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// 9MB → three blocks: two full 4MB blocks of different bytes, then a 1MB tail.
const bytes = new Uint8Array(9 * MB)
bytes.fill(1, 0, 4 * MB)
bytes.fill(2, 4 * MB, 8 * MB)
bytes.fill(3, 8 * MB)
const big = new File([bytes], 'big.bin')
const hashes = Promise.all([
  sha256Hex(bytes.subarray(0, 4 * MB)),
  sha256Hex(bytes.subarray(4 * MB, 8 * MB)),
  sha256Hex(bytes.subarray(8 * MB)),
])

type CommitAnswer = { needBlocks?: string[]; versionId?: string; error?: { status: number; message: string } }

const commitCalls = () =>
  api.post.mock.calls.filter(([url]) => url === '/api/v1/files/commit').map(([, body]) => body.files)
const blockCalls = () =>
  api.post.mock.calls
    .filter(([url]) => url === '/api/v1/storage/blocks')
    .map(([, form]) => (form as FormData).getAll('hash'))

/** Each commit answers with the next list (one answer per file it carries); blocks always succeed. */
function answer(...commits: CommitAnswer[][]) {
  const queue = [...commits]
  api.post.mockImplementation((url: string) =>
    url === '/api/v1/files/commit'
      ? Promise.resolve({ results: queue.shift() ?? [] })
      : Promise.resolve(undefined),
  )
}

const target = (file: File, name = file.name) => ({ path: '/docs', name, file })
/** Hashes like the hook does (on the main thread here — jsdom has no Worker), then uploads. */
const send = async (targets: UploadTarget[], onProgress: (index: number, sent: number) => void = () => {}) =>
  uploadGroup(targets, await Promise.all(targets.map(({ file }) => hashFile(file))), onProgress)
const committed = { needBlocks: [], versionId: 'v' }

beforeEach(() => {
  vi.clearAllMocks()
  api.post.mockReset()
})

describe('groupForCommit', () => {
  const small = (i: number) => ({ file: new File(['x'], `f${i}`) })
  const sized = (blocks: number) => ({ file: { size: blocks * 4 * MB } as File })

  it('starts a new group at 100 files or when the next file would pass 1,280 hashes', () => {
    expect(groupForCommit(Array.from({ length: 250 }, (_, i) => small(i))).map((g) => g.length)).toEqual([100, 100, 50])
    expect(groupForCommit(Array.from({ length: 50 }, () => sized(30))).map((g) => g.length)).toEqual([42, 8])
  })

  it('puts a file over 256MB in a group of its own, so small files never wait on it', () => {
    expect(groupForCommit([small(0), sized(65), small(1), small(2)]).map((g) => g.length)).toEqual([1, 1, 2])
    expect(groupForCommit([sized(1280), sized(1000)]).map((g) => g.length)).toEqual([1, 1])
    expect(groupForCommit([sized(64), sized(64), small(0)]).map((g) => g.length)).toEqual([3])
  })
})

describe('uploadGroup', () => {
  it('commits the group, sends only the blocks the server lacks, then commits those files again', async () => {
    const [h0, h1, h2] = await hashes
    answer([{ needBlocks: [h1, h2] }], [committed])
    const progress: number[] = []

    const outcomes = await send([target(big, 'a.bin')], (_, sent) => progress.push(sent))

    const [first, second] = commitCalls()
    expect(first).toEqual([
      expect.objectContaining({ path: '/docs', name: 'a.bin', size: big.size, blocklist: [h0, h1, h2] }),
    ])
    expect(second).toEqual(first) // same uploadId, so a lost response can be resent safely
    // 4MB + 1MB fit one 8MB request.
    expect(blockCalls()).toEqual([[h1, h2]])
    expect(progress).toEqual([4 * MB, big.size])
    expect(outcomes).toEqual([null])
  })

  it('sends no bytes and commits once when the server already has every block', async () => {
    answer([committed, committed])

    const outcomes = await send([target(big), target(new File([], 'empty.txt'))])

    expect(commitCalls()).toHaveLength(1)
    expect(commitCalls()[0][1]).toMatchObject({ size: 0, blocklist: [] })
    expect(blockCalls()).toEqual([])
    expect(outcomes).toEqual([null, null])
  })

  it('sends a block several files share only once, and commits again only the files that needed blocks', async () => {
    const tail = new Uint8Array(10).fill(9)
    const h = await sha256Hex(tail)
    answer([{ needBlocks: [h] }, committed, { needBlocks: [h] }], [committed, committed])

    await send(
      [target(new File([tail], 'a')), target(new File(['ok'], 'b')), target(new File([tail], 'c'))],
      () => {},
    )

    expect(blockCalls()).toEqual([[h]])
    expect(commitCalls()[1].map((file: { name: string }) => file.name)).toEqual(['a', 'c'])
  })

  it('packs blocks into requests of at most 8MB', async () => {
    const [h0, h1, h2] = await hashes
    answer([{ needBlocks: [h0, h1, h2] }], [committed])

    await send([target(big)])

    expect(blockCalls()).toEqual([[h0, h1], [h2]])
  })

  it('keeps up to three block requests in flight at once', async () => {
    const files = Array.from({ length: 5 }, (_, i) => new File([new Uint8Array(4 * MB).fill(i + 1)], `f${i}`))
    const hashesOf = await Promise.all(files.map((f) => hashFile(f).then((list) => list[0])))
    let inFlight = 0
    let most = 0
    const releases: (() => void)[] = []
    api.post.mockImplementation((url: string) => {
      if (url === '/api/v1/files/commit') {
        return Promise.resolve({
          results: commitCalls().length === 1 ? hashesOf.map((h) => ({ needBlocks: [h] })) : files.map(() => committed),
        })
      }
      inFlight++
      most = Math.max(most, inFlight)
      return new Promise<void>((resolve) => releases.push(() => (inFlight--, resolve())))
    })

    const upload = send(files.map((f) => target(f)))
    // Two 4MB blocks per 8MB request: three requests for five blocks, all started together.
    await vi.waitFor(() => expect(releases).toHaveLength(3))
    releases.forEach((release) => release())
    expect(await upload).toEqual(files.map(() => null))
    expect(most).toBe(3)
  })

  it('fails only the file the server rejected', async () => {
    answer([{ error: { status: 400, message: '같은 위치에 같은 이름의 항목이 이미 존재합니다.' } }, committed])

    const outcomes = await send([target(new File(['a'], 'a')), target(new File(['b'], 'b'))])

    expect(outcomes[0]?.message).toBe('같은 위치에 같은 이름의 항목이 이미 존재합니다.')
    expect(outcomes[1]).toBeNull()
  })

  it('fails a file whose blocks are still missing after the upload', async () => {
    const [, h1] = await hashes
    answer([{ needBlocks: [h1] }], [{ needBlocks: [h1] }])

    const outcomes = await send([target(big)])

    expect(outcomes[0]?.message).toBe('Blocks still missing after upload')
  })

  it('pauses past the quick retries and resumes on its own once storage is back', async () => {
    const [h0, h1, h2] = await hashes
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
    try {
      let storageDown = true
      api.post.mockImplementation((url: string) =>
        url === '/api/v1/files/commit'
          ? Promise.resolve({ results: commitCalls().length === 1 ? [{ needBlocks: [h0, h1, h2] }] : [committed] })
          : storageDown
            ? Promise.reject(Object.assign(new Error('저장소에 일시적으로 연결할 수 없습니다.'), { status: 503 }))
            : Promise.resolve(undefined),
      )
      const onPause = vi.fn()
      const upload = uploadGroup([target(big)], [await hashes], () => {}, onPause)
      let done = false
      void upload.finally(() => (done = true))
      await vi.advanceTimersByTimeAsync(60_000)
      expect(onPause).toHaveBeenCalledWith(true)
      storageDown = false
      while (!done) await vi.advanceTimersByTimeAsync(5_000)

      expect(await upload).toEqual([null])
      // Two requests paused, but the group is told once each way.
      expect(onPause.mock.calls).toEqual([[true], [false]])
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops sending after 10 minutes paused, failing the files that still miss blocks', async () => {
    const [h0, h1, h2] = await hashes
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
    try {
      api.post.mockImplementation((url: string) =>
        url === '/api/v1/files/commit'
          ? Promise.resolve({ results: [{ needBlocks: [h0, h1, h2] }, committed] })
          : Promise.reject(Object.assign(new Error('저장소에 일시적으로 연결할 수 없습니다.'), { status: 503 })),
      )
      const upload = send([target(big), target(new File(['ok'], 'b'))])
      let done = false
      void upload.finally(() => (done = true))
      while (!done) await vi.advanceTimersByTimeAsync(30_000)

      const outcomes = await upload
      expect(outcomes[0]?.message).toBe('저장소에 일시적으로 연결할 수 없습니다.')
      expect(outcomes[1]).toBeNull()
      expect(commitCalls()).toHaveLength(1)
      // Both requests were already in flight; no third one starts.
      expect(new Set(blockCalls().map((hashesSent) => hashesSent.join()))).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('waits at least as long as Retry-After says', async () => {
    const blocklist = await hashes
    const [, h1] = blocklist
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    try {
      let failures = 1
      api.post.mockImplementation((url: string) =>
        url === '/api/v1/files/commit'
          ? Promise.resolve({ results: commitCalls().length === 1 ? [{ needBlocks: [h1] }] : [committed] })
          : failures-- > 0
            ? Promise.reject(Object.assign(new Error('busy'), { status: 503, retryAfter: 10 }))
            : Promise.resolve(undefined),
      )
      const upload = uploadGroup([target(big)], [blocklist], () => {})
      await vi.advanceTimersByTimeAsync(9_000)
      expect(blockCalls()).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(blockCalls()).toHaveLength(2)
      expect(await upload).toEqual([null])
    } finally {
      vi.useRealTimers()
    }
  })

  it('fails only the files whose blocks were refused, and keeps sending the rest', async () => {
    const [h0, h1, h2] = await hashes
    const other = new File(['other'], 'c')
    const [otherHash] = await hashFile(other)
    api.post.mockImplementation((url: string, body: FormData | object) => {
      if (url === '/api/v1/files/commit') {
        return Promise.resolve({
          results: commitCalls().length === 1 ? [{ needBlocks: [h0, h1, h2] }, { needBlocks: [otherHash] }] : [committed],
        })
      }
      // The big file changed since it was hashed: its first request no longer matches.
      return (body as FormData).getAll('hash').includes(h0)
        ? Promise.reject(Object.assign(new Error('블록이 올바르지 않습니다.'), { status: 400 }))
        : Promise.resolve(undefined)
    })

    const outcomes = await send([target(big), target(other)])

    expect(outcomes[0]?.message).toBe('블록이 올바르지 않습니다.')
    expect(outcomes[1]).toBeNull()
    expect(commitCalls()[1]).toHaveLength(1)
  })

  it('does not retry a 429 — on uploads it is only the 24-hour limit', async () => {
    const [, h1] = await hashes
    api.post.mockImplementation((url: string) =>
      url === '/api/v1/files/commit'
        ? Promise.resolve({ results: [{ needBlocks: [h1] }] })
        : Promise.reject(Object.assign(new Error('업로드 한도를 초과했습니다.'), { status: 429 })),
    )

    const outcomes = await send([target(big)])

    expect(blockCalls()).toHaveLength(1)
    expect(outcomes[0]?.message).toBe('업로드 한도를 초과했습니다.')
  })

  it('stops every request on a 401 instead of sending the rest for nothing', async () => {
    const [h0, h1, h2] = await hashes
    api.post.mockImplementation((url: string) =>
      url === '/api/v1/files/commit'
        ? Promise.resolve({ results: [{ needBlocks: [h0, h1, h2] }] })
        : Promise.reject(Object.assign(new Error('로그인이 필요합니다.'), { status: 401 })),
    )

    const outcomes = await uploadGroup([target(big)], [await hashes], () => {})

    // Both in-flight requests got their 401; no third request was ever packed and sent.
    expect(blockCalls().length).toBeLessThanOrEqual(2)
    expect(outcomes[0]?.message).toBe('로그인이 필요합니다.')
  })

  it('marks a file the commit refused for a full drive', async () => {
    answer([{ error: { status: 413, message: '저장 공간이 부족합니다.' } }])

    const [outcome] = await send([target(new File(['x'], 'a'))])

    expect(outcome?.message).toBe('저장 공간이 부족합니다.')
    expect((outcome as { quotaExceeded?: boolean }).quotaExceeded).toBe(true)
  })

  it('does not retry a 4xx block request', async () => {
    const [, h1] = await hashes
    api.post.mockImplementation((url: string) =>
      url === '/api/v1/files/commit'
        ? Promise.resolve({ results: [{ needBlocks: [h1] }] })
        : Promise.reject(Object.assign(new Error('bad'), { status: 400 })),
    )

    const outcomes = await send([target(big)])

    expect(blockCalls()).toHaveLength(1)
    expect(outcomes[0]?.message).toBe('bad')
  })
})

describe('commitFolders', () => {
  it('sends the folders as one commit and answers one result per folder, in order', async () => {
    api.post.mockResolvedValue({ results: [], directories: [{ fileId: 'f1' }, { error: { status: 400, message: 'x' } }] })

    const results = await commitFolders([
      { path: '/사진', name: '빈폴더' },
      { path: '/', name: 'a.bin' },
    ])

    expect(api.post).toHaveBeenCalledWith('/api/v1/files/commit', {
      directories: [
        { path: '/사진', name: '빈폴더' },
        { path: '/', name: 'a.bin' },
      ],
    })
    expect(results.map((r) => r.error === undefined)).toEqual([true, false])
  })
})
