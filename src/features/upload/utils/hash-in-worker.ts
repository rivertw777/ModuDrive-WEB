import { BLOCK_SIZE, blockCountOf, hashBlocks } from './hash-blocks'

type Reply = { blocklist?: string[]; error?: string }
type Task = {
  file: Blob
  from: number
  to: number
  resolve: (blocklist: string[]) => void
  reject: (error: Error) => void
}

// Blocks per task (64MB): a big file's ranges spread over every worker, and a small file is one task.
const BLOCKS_PER_TASK = 16
// One worker per core, up to 8 — blocks hash independently, so a big file gets that much faster.
// Each worker holds one 4MB block at a time.
const POOL_SIZE = Math.min(typeof navigator === 'undefined' ? 2 : navigator.hardwareConcurrency || 2, 8)

// First in, first hashed: files picked first are ready first, which is the order they upload in.
const queue: Task[] = []
const idle: Worker[] = []
const busy = new Map<Worker, Task>()
let workers = 0

function spawn() {
  const worker = new Worker(new URL('./hash-blocks.worker.ts', import.meta.url), { type: 'module' })
  workers++
  worker.onmessage = ({ data }: MessageEvent<Reply>) => {
    const task = busy.get(worker)
    busy.delete(worker)
    if (data.blocklist) task?.resolve(data.blocklist)
    else task?.reject(new Error(data.error ?? 'Hashing failed'))
    idle.push(worker)
    pump()
  }
  // A broken worker fails the range it holds and is replaced on the next task. A file that can't be
  // passed to it (messageerror) is the same: that range fails, the worker is dropped.
  const fail = (message: string) => {
    busy.get(worker)?.reject(new Error(message || 'Hashing failed'))
    busy.delete(worker)
    const at = idle.indexOf(worker)
    if (at >= 0) idle.splice(at, 1)
    worker.terminate()
    workers--
    pump()
  }
  worker.onerror = (event) => fail(event.message)
  worker.onmessageerror = () => fail('Hashing failed')
  return worker
}

function pump() {
  while (queue.length > 0) {
    const worker = idle.pop() ?? (workers < POOL_SIZE ? spawn() : undefined)
    if (!worker) return
    const [task] = queue.splice(0, 1)
    busy.set(worker, task)
    worker.postMessage({ file: task.file, from: task.from, to: task.to })
  }
}

/** {@link hashBlocks} split over a pool of Web Workers, so the page stays responsive and a big file
 * uses every core; on the main thread where there are no workers (tests). Rejects if the file
 * can't be read. `onHashed` gets the bytes of each range as it finishes, for a "preparing" percentage. */
export async function hashFile(file: Blob, onHashed: (bytes: number) => void = () => {}): Promise<string[]> {
  if (typeof Worker === 'undefined') {
    const blocklist = await hashBlocks(file)
    onHashed(file.size)
    return blocklist
  }
  const ranges: Promise<string[]>[] = []
  for (let from = 0; from < blockCountOf(file); from += BLOCKS_PER_TASK) {
    const to = Math.min(from + BLOCKS_PER_TASK, blockCountOf(file))
    const bytes = Math.min(to * BLOCK_SIZE, file.size) - from * BLOCK_SIZE
    const range = new Promise<string[]>((resolve, reject) => queue.push({ file, from, to, resolve, reject }))
    ranges.push(
      range.then((blocklist) => {
        onHashed(bytes)
        return blocklist
      }),
    )
  }
  pump()
  return (await Promise.all(ranges)).flat()
}
