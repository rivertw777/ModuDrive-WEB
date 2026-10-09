import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ apiClient: api }))

import { uploadBytes } from './upload-file'

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
const file = new File([bytes], 'big.bin')
const hashes = Promise.all([
  sha256Hex(bytes.subarray(0, 4 * MB)),
  sha256Hex(bytes.subarray(4 * MB, 8 * MB)),
  sha256Hex(bytes.subarray(8 * MB)),
])

const commitCalls = () => api.post.mock.calls.filter(([url]) => (url as string).endsWith('/commit'))
const putHashes = () => api.put.mock.calls.map(([url]) => (url as string).split('/').pop())

/** First commit answers `need`, every later one answers nothing missing. */
function commitAnswers(need: string[]) {
  api.post.mockResolvedValueOnce({ needBlocks: need, versionId: null })
  api.post.mockResolvedValue({ needBlocks: [], versionId: 'v1' })
}

beforeEach(() => {
  vi.clearAllMocks()
  api.post.mockReset()
  api.put.mockReset()
  api.put.mockResolvedValue(undefined)
})

describe('uploadBytes', () => {
  it('commits the blocklist, uploads only the blocks the server lacks, then commits again', async () => {
    const [h0, h1, h2] = await hashes
    commitAnswers([h1, h2])
    const progress: number[] = []

    await uploadBytes('file-1', file, (sent) => progress.push(sent))

    const [first, second] = commitCalls()
    expect(first[0]).toBe('/api/v1/files/file-1/commit')
    expect(first[1]).toMatchObject({ size: file.size, blocklist: [h0, h1, h2] })
    expect(second[1]).toEqual(first[1]) // same uploadId, so a lost response can be resent safely
    expect(putHashes()).toEqual([h1, h2])
    expect(progress).toEqual([4 * MB, 8 * MB, file.size])
  })

  it('sends no bytes when the server already has every block', async () => {
    commitAnswers([])

    await uploadBytes('file-1', file, () => {})

    expect(commitCalls()).toHaveLength(1)
    expect(api.put).not.toHaveBeenCalled()
  })

  it('commits an empty file with an empty blocklist', async () => {
    commitAnswers([])

    await uploadBytes('file-1', new File([], 'empty.txt'), () => {})

    expect(commitCalls()[0][1]).toMatchObject({ size: 0, blocklist: [] })
  })

  it('uploads a block that repeats in the file only once', async () => {
    const same = new Uint8Array(8 * MB).fill(7)
    const h = await sha256Hex(same.subarray(0, 4 * MB))
    commitAnswers([h])

    await uploadBytes('file-1', new File([same], 'twice.bin'), () => {})

    expect(commitCalls()[0][1]).toMatchObject({ blocklist: [h, h] })
    expect(putHashes()).toEqual([h])
  })

  it('fails when the second commit still finds blocks missing', async () => {
    const [, h1] = await hashes
    api.post.mockResolvedValue({ needBlocks: [h1], versionId: null })

    await expect(uploadBytes('file-1', file, () => {})).rejects.toThrow('Blocks still missing')
  })

  it('retries a block that failed with a 5xx, and gives up after three retries', async () => {
    const [, h1] = await hashes
    // Only setTimeout: hashing is real async work, so the clock is stepped until the upload settles
    // instead of being run out once up front.
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const settle = async (upload: Promise<void>) => {
      let done = false
      upload.then(
        () => (done = true),
        () => (done = true),
      )
      while (!done) await vi.advanceTimersByTimeAsync(1000)
      return upload
    }
    try {
      commitAnswers([h1])
      api.put.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 503 }))
      await settle(uploadBytes('file-1', file, () => {}))
      expect(putHashes()).toEqual([h1, h1])

      api.put.mockReset()
      commitAnswers([h1])
      api.put.mockRejectedValue(Object.assign(new Error('down'), { status: 500 }))
      await expect(settle(uploadBytes('file-1', file, () => {}))).rejects.toThrow('down')
      expect(api.put).toHaveBeenCalledTimes(4) // first try + 3 retries
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not retry a 4xx', async () => {
    const [, h1] = await hashes
    commitAnswers([h1])
    api.put.mockRejectedValue(Object.assign(new Error('bad'), { status: 400 }))

    await expect(uploadBytes('file-1', file, () => {})).rejects.toThrow('bad')
    expect(api.put).toHaveBeenCalledTimes(1)
  })
})
