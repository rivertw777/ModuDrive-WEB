import { afterEach, describe, expect, it, vi } from 'vitest'
import { BLOCK_SIZE, hashBlocks } from './hash-blocks'

type Sent = { file: Blob; from: number; to: number }

/** A stand-in Worker that answers only when told to. */
class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  sent: Sent[] = []
  constructor() {
    FakeWorker.instances.push(this)
  }
  postMessage(message: Sent) {
    this.sent.push(message)
  }
  answer(blocklist: string[]) {
    this.onmessage?.({ data: { blocklist } } as MessageEvent)
  }
  terminate() {}
}

/** Only `size` is read to split a file into ranges; the fake workers never touch the bytes. */
const fileOfBlocks = (blocks: number) => ({ size: blocks * BLOCK_SIZE }) as Blob

async function loadWithPool(size: number) {
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('navigator', { hardwareConcurrency: size })
  return import('./hash-in-worker')
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  FakeWorker.instances = []
})

describe('hashFile', () => {
  it('hashes on the main thread where there is no Worker', async () => {
    vi.stubGlobal('Worker', undefined)
    const { hashFile } = await import('./hash-in-worker')
    const file = new File(['abc'], 'a.txt')

    expect(await hashFile(file)).toEqual(await hashBlocks(file))
  })

  it('splits a big file into 16-block ranges over the pool and joins them in block order', async () => {
    const { hashFile } = await loadWithPool(2)

    const hashing = hashFile(fileOfBlocks(17))
    const [first, second] = FakeWorker.instances
    expect(first.sent.map(({ from, to }) => [from, to])).toEqual([[0, 16]])
    expect(second.sent.map(({ from, to }) => [from, to])).toEqual([[16, 17]])
    second.answer(['h16'])
    first.answer(['h0', 'h1'])

    expect(await hashing).toEqual(['h0', 'h1', 'h16'])
  })

  it('never starts more workers than the pool, and hands the next range to a freed one', async () => {
    const { hashFile } = await loadWithPool(1)

    const first = hashFile(new File(['a'], 'a'))
    const second = hashFile(new File(['b'], 'b'))
    const [worker] = FakeWorker.instances
    expect(worker.sent).toHaveLength(1)
    worker.answer(['a'])
    expect(worker.sent).toHaveLength(2)
    worker.answer(['b'])

    expect(FakeWorker.instances).toHaveLength(1)
    expect(await first).toEqual(['a'])
    expect(await second).toEqual(['b'])
  })

  it('fails only the file whose range broke, and replaces the broken worker', async () => {
    const { hashFile } = await loadWithPool(1)

    const lost = hashFile(new File(['a'], 'a'))
    const next = hashFile(new File(['b'], 'b'))
    FakeWorker.instances[0].onerror?.({ message: 'crashed' } as ErrorEvent)
    await expect(lost).rejects.toThrow('crashed')

    expect(FakeWorker.instances).toHaveLength(2)
    FakeWorker.instances[1].answer(['b'])
    expect(await next).toEqual(['b'])
  })

  it('reports each range\'s bytes as it finishes', async () => {
    const { hashFile } = await loadWithPool(2)
    const onHashed = vi.fn()

    const hashing = hashFile({ size: 16 * BLOCK_SIZE + 10 } as Blob, onHashed)
    FakeWorker.instances[1].answer(['tail'])
    FakeWorker.instances[0].answer(['h0'])
    await hashing

    expect(onHashed.mock.calls).toEqual([[10], [16 * BLOCK_SIZE]])
  })
})
