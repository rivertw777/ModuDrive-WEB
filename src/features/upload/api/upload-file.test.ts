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
type UrlRequest = { blocks: { hash: string; size: number }[] }

const commitCalls = () =>
  api.post.mock.calls.filter(([url]) => url === '/api/v1/files/commit').map(([, body]) => body.files)
/** The hashes of each URL request, in order. */
const urlCalls = () =>
  api.post.mock.calls
    .filter(([url]) => url === '/api/v1/storage/blocks/upload-urls')
    .map(([, body]) => (body as UrlRequest).blocks.map((block) => block.hash))
const s3Url = (hash: string) => `https://bucket.s3.test/blocks/${hash}?signed`
const urlsFor = (body: UrlRequest) => Promise.resolve({ urls: body.blocks.map((block) => s3Url(block.hash)) })

/** S3: each PUT answers with the next status for its hash (200 once they run out). */
const s3 = vi.fn<(url: string, init: RequestInit) => Promise<{ ok: boolean; status: number }>>()
const putHashes = () => s3.mock.calls.map(([url]) => url.split('/blocks/')[1].split('?')[0])
const s3Answers = (statusOf: (hash: string) => number) =>
  s3.mockImplementation((url) => {
    const status = statusOf(url.split('/blocks/')[1].split('?')[0])
    return Promise.resolve({ ok: status < 300, status })
  })

/** Each commit answers with the next list (one answer per file it carries); URLs and PUTs always succeed. */
function answer(...commits: CommitAnswer[][]) {
  const queue = [...commits]
  api.post.mockImplementation((url: string, body: UrlRequest) =>
    url === '/api/v1/files/commit' ? Promise.resolve({ results: queue.shift() ?? [] }) : urlsFor(body),
  )
}

const target = (file: File, name = file.name) => ({ path: '/docs', name, file })
/** Hashes like the hook does (on the main thread here — jsdom has no Worker), then uploads. */
const send = async (targets: UploadTarget[], onProgress: (index: number, sent: number) => void = () => {}) =>
  uploadGroup(targets, await Promise.all(targets.map(({ file }) => hashFile(file))), onProgress)
const committed = { needBlocks: [], versionId: 'v' }
const fourMbFiles = (count: number) =>
  Array.from({ length: count }, (_, i) => new File([new Uint8Array(4 * MB).fill(i + 1)], `f${i}`))

beforeEach(() => {
  vi.clearAllMocks()
  api.post.mockReset()
  s3.mockReset()
  s3Answers(() => 200)
  vi.stubGlobal('fetch', s3)
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
  it('commits the group, PUTs only the blocks the server lacks straight to S3, then commits those files again', async () => {
    const [h0, h1, h2] = await hashes
    answer([{ needBlocks: [h1, h2] }], [committed])
    const progress: number[] = []

    const outcomes = await send([target(big, 'a.bin')], (_, sent) => progress.push(sent))

    const [first, second] = commitCalls()
    expect(first).toEqual([
      expect.objectContaining({ path: '/docs', name: 'a.bin', size: big.size, blocklist: [h0, h1, h2] }),
    ])
    expect(second).toEqual(first) // same uploadId, so a lost response can be resent safely
    expect(api.post).toHaveBeenCalledWith('/api/v1/storage/blocks/upload-urls', {
      blocks: [
        { hash: h1, size: 4 * MB },
        { hash: h2, size: MB },
      ],
    })
    expect(putHashes().sort()).toEqual([h1, h2].sort())
    expect(progress[progress.length - 1]).toBe(big.size)
    expect(outcomes).toEqual([null])
  })

  it('sends each block with the checksum S3 checks it against', async () => {
    const [, h1] = await hashes
    answer([{ needBlocks: [h1] }], [committed])

    await send([target(big)])

    const [url, init] = s3.mock.calls[0]
    expect(url).toBe(s3Url(h1))
    expect(init.method).toBe('PUT')
    expect((init.body as Blob).size).toBe(4 * MB)
    const digest = await crypto.subtle.digest('SHA-256', bytes.subarray(4 * MB, 8 * MB))
    expect(init.headers).toEqual({
      'x-amz-checksum-sha256': btoa(String.fromCharCode(...new Uint8Array(digest))),
      'If-None-Match': '*',
    })
  })

  it('counts a block S3 already holds (412) as sent', async () => {
    const [h0, h1, h2] = await hashes
    answer([{ needBlocks: [h0, h1, h2] }], [committed])
    s3Answers((hash) => (hash === h1 ? 412 : 200))

    const outcomes = await send([target(big)])

    expect(outcomes).toEqual([null])
    expect(s3.mock.calls.filter(([url]) => url === s3Url(h1))).toHaveLength(1)
    expect(commitCalls()).toHaveLength(2)
  })

  it('tries again when another PUT of the same block is in flight (409), ending in 412', async () => {
    const [, h1] = await hashes
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    try {
      answer([{ needBlocks: [h1] }], [committed])
      const statuses = [409, 412]
      s3Answers(() => statuses.shift() ?? 200)

      const upload = uploadGroup([target(big)], [await hashes], () => {})
      let done = false
      void upload.finally(() => (done = true))
      while (!done) await vi.advanceTimersByTimeAsync(1_000)

      expect(await upload).toEqual([null])
      expect(s3).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('sends no bytes and commits once when the server already has every block', async () => {
    answer([committed, committed])

    const outcomes = await send([target(big), target(new File([], 'empty.txt'))])

    expect(commitCalls()).toHaveLength(1)
    expect(commitCalls()[0][1]).toMatchObject({ size: 0, blocklist: [] })
    expect(urlCalls()).toEqual([])
    expect(s3).not.toHaveBeenCalled()
    expect(outcomes).toEqual([null, null])
  })

  it('sends a block several files share only once, and commits again only the files that needed blocks', async () => {
    const tail = new Uint8Array(10).fill(9)
    const h = await sha256Hex(tail)
    answer([{ needBlocks: [h] }, committed, { needBlocks: [h] }], [committed, committed])

    await send([target(new File([tail], 'a')), target(new File(['ok'], 'b')), target(new File([tail], 'c'))])

    expect(urlCalls()).toEqual([[h]])
    expect(putHashes()).toEqual([h])
    expect(commitCalls()[1].map((file: { name: string }) => file.name)).toEqual(['a', 'c'])
  })

  it('asks for URLs in requests of at most 64 blocks', async () => {
    const files = Array.from({ length: 65 }, (_, i) => new File([`file ${i}`], `f${i}`))
    const blocklists = await Promise.all(files.map((file) => hashFile(file)))
    answer(
      blocklists.map((list) => ({ needBlocks: list })),
      files.map(() => committed),
    )

    await send(files.map((file) => target(file)))

    expect(urlCalls().map((request) => request.length)).toEqual([64, 1])
  })

  it('asks for URLs in requests of at most 32MB', async () => {
    const files = fourMbFiles(9)
    const blocklists = await Promise.all(files.map((file) => hashFile(file)))
    answer(
      blocklists.map((list) => ({ needBlocks: list })),
      files.map(() => committed),
    )

    await send(files.map((file) => target(file)))

    expect(urlCalls().map((request) => request.length)).toEqual([8, 1])
  })

  it('keeps up to six PUTs in flight at once', async () => {
    const files = fourMbFiles(8)
    const blocklists = await Promise.all(files.map((file) => hashFile(file)))
    answer(
      blocklists.map((list) => ({ needBlocks: list })),
      files.map(() => committed),
    )
    let inFlight = 0
    let most = 0
    const releases: (() => void)[] = []
    s3.mockImplementation(() => {
      inFlight++
      most = Math.max(most, inFlight)
      return new Promise((resolve) => releases.push(() => (inFlight--, resolve({ ok: true, status: 200 }))))
    })

    const upload = send(files.map((file) => target(file)))
    await vi.waitFor(() => expect(releases).toHaveLength(6))
    while (releases.length > 0) {
      releases.splice(0).forEach((release) => release())
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    expect(await upload).toEqual(files.map(() => null))
    expect(most).toBe(6)
    expect(urlCalls()).toHaveLength(1)
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

  it('pauses past the quick retries and resumes on its own once S3 is back', async () => {
    const [h0, h1, h2] = await hashes
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
    try {
      answer([{ needBlocks: [h0, h1, h2] }], [committed])
      let s3Down = true
      s3Answers(() => (s3Down ? 503 : 200))
      const onPause = vi.fn()
      const upload = uploadGroup([target(big)], [await hashes], () => {}, onPause)
      let done = false
      void upload.finally(() => (done = true))
      await vi.advanceTimersByTimeAsync(60_000)
      expect(onPause).toHaveBeenCalledWith(true)
      s3Down = false
      while (!done) await vi.advanceTimersByTimeAsync(5_000)

      expect(await upload).toEqual([null])
      // Three PUTs paused, but the group is told once each way.
      expect(onPause.mock.calls).toEqual([[true], [false]])
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops sending after 10 minutes paused, failing the files that still miss blocks', async () => {
    const [h0, h1, h2] = await hashes
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
    try {
      answer([{ needBlocks: [h0, h1, h2] }, committed])
      s3.mockRejectedValue(new TypeError('Failed to fetch'))
      const upload = send([target(big), target(new File(['ok'], 'b'))])
      let done = false
      void upload.finally(() => (done = true))
      while (!done) await vi.advanceTimersByTimeAsync(30_000)

      const outcomes = await upload
      expect(outcomes[0]?.message).toBe('Failed to fetch')
      expect(outcomes[1]).toBeNull()
      expect(commitCalls()).toHaveLength(1)
      expect(new Set(putHashes())).toEqual(new Set([h0, h1, h2]))
    } finally {
      vi.useRealTimers()
    }
  })

  it('waits at least as long as Retry-After says before asking for URLs again', async () => {
    const blocklist = await hashes
    const [, h1] = blocklist
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    try {
      let failures = 1
      api.post.mockImplementation((url: string, body: UrlRequest) =>
        url === '/api/v1/files/commit'
          ? Promise.resolve({ results: commitCalls().length === 1 ? [{ needBlocks: [h1] }] : [committed] })
          : failures-- > 0
            ? Promise.reject(Object.assign(new Error('busy'), { status: 503, retryAfter: 10 }))
            : urlsFor(body),
      )
      const upload = uploadGroup([target(big)], [blocklist], () => {})
      await vi.advanceTimersByTimeAsync(9_000)
      expect(urlCalls()).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(urlCalls()).toHaveLength(2)
      expect(await upload).toEqual([null])
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    [400, 'the file changed since it was hashed'],
    [403, 'the URL expired'],
  ])('fails only the files whose block S3 refused with %i (%s), and keeps sending the rest', async (status) => {
    const [h0, h1, h2] = await hashes
    const other = new File(['other'], 'c')
    const [otherHash] = await hashFile(other)
    answer([{ needBlocks: [h0, h1, h2] }, { needBlocks: [otherHash] }], [committed])
    s3Answers((hash) => (hash === h0 ? status : 200))

    const outcomes = await send([target(big), target(other)])

    expect((outcomes[0] as { status?: number }).status).toBe(status)
    expect(outcomes[1]).toBeNull()
    expect(commitCalls()[1]).toHaveLength(1)
    expect(s3.mock.calls.filter(([url]) => url === s3Url(h0))).toHaveLength(1) // not retried
  })

  it('does not retry a 429 — on uploads it is only the 24-hour limit', async () => {
    const [, h1] = await hashes
    api.post.mockImplementation((url: string) =>
      url === '/api/v1/files/commit'
        ? Promise.resolve({ results: [{ needBlocks: [h1] }] })
        : Promise.reject(Object.assign(new Error('업로드 한도를 초과했습니다.'), { status: 429 })),
    )

    const outcomes = await send([target(big)])

    expect(urlCalls()).toHaveLength(1)
    expect(s3).not.toHaveBeenCalled()
    expect(outcomes[0]?.message).toBe('업로드 한도를 초과했습니다.')
  })

  it('stops every block on a 401 instead of sending the rest for nothing', async () => {
    const [h0, h1, h2] = await hashes
    api.post.mockImplementation((url: string) =>
      url === '/api/v1/files/commit'
        ? Promise.resolve({ results: [{ needBlocks: [h0, h1, h2] }] })
        : Promise.reject(Object.assign(new Error('로그인이 필요합니다.'), { status: 401 })),
    )

    const outcomes = await uploadGroup([target(big)], [await hashes], () => {})

    expect(urlCalls()).toHaveLength(1)
    expect(s3).not.toHaveBeenCalled()
    expect(outcomes[0]?.message).toBe('로그인이 필요합니다.')
  })

  it('marks a file the commit refused for a full drive', async () => {
    answer([{ error: { status: 413, message: '저장 공간이 부족합니다.' } }])

    const [outcome] = await send([target(new File(['x'], 'a'))])

    expect(outcome?.message).toBe('저장 공간이 부족합니다.')
    expect((outcome as { quotaExceeded?: boolean }).quotaExceeded).toBe(true)
  })

  it('does not retry a URL request the server refused (400/413), failing only its files', async () => {
    const [, h1] = await hashes
    api.post.mockImplementation((url: string) =>
      url === '/api/v1/files/commit'
        ? Promise.resolve({ results: [{ needBlocks: [h1] }] })
        : Promise.reject(Object.assign(new Error('bad'), { status: 400 })),
    )

    const outcomes = await send([target(big)])

    expect(urlCalls()).toHaveLength(1)
    expect(s3).not.toHaveBeenCalled()
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
