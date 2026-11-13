import { describe, expect, it } from 'vitest'
import { runPipelined } from './run-pipelined'

/** A task the test finishes or marks ready by hand. */
function controlled() {
  const started: number[] = []
  const finish = new Map<number, () => void>()
  const ready = new Map<number, () => void>()
  const run = (item: number, readyFn: () => void) => {
    started.push(item)
    ready.set(item, readyFn)
    return new Promise<void>((resolve) => finish.set(item, resolve))
  }
  return {
    started,
    run,
    /** Ends the item's task. */
    finish: (item: number) => finish.get(item)?.(),
    /** Calls the item's `ready`. */
    ready: (item: number) => ready.get(item)?.(),
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('runPipelined', () => {
  it('starts the next item only when the one before says it is ready', async () => {
    const { started, finish, ready, run } = controlled()
    const done = runPipelined([1, 2, 3], run, 3)
    await tick()
    expect(started).toEqual([1])
    ready(1)
    await tick()
    expect(started).toEqual([1, 2])
    ready(2)
    await tick()
    expect(started).toEqual([1, 2, 3])
    for (const item of [1, 2, 3]) finish(item)
    await done
  })

  it('starts the next item when the one before ends without saying it is ready', async () => {
    const { started, finish, run } = controlled()
    const done = runPipelined([1, 2], run, 3)
    await tick()
    finish(1)
    await tick()
    expect(started).toEqual([1, 2])
    finish(2)
    await done
  })

  it('never runs more than the limit at once, and fills a slot as soon as one frees', async () => {
    const { started, finish, ready, run } = controlled()
    const done = runPipelined([1, 2, 3], run, 2)
    await tick()
    ready(1)
    await tick()
    ready(2)
    await tick()
    // 1 and 2 still running: 3 waits even though 2 is ready.
    expect(started).toEqual([1, 2])
    finish(1)
    await tick()
    expect(started).toEqual([1, 2, 3])
    finish(2)
    finish(3)
    await done
  })

  it('resolves only once every item has ended', async () => {
    const { finish, ready, run } = controlled()
    let resolved = false
    const done = runPipelined([1, 2], run, 3).then(() => (resolved = true))
    await tick()
    ready(1)
    await tick()
    finish(2)
    await tick()
    expect(resolved).toBe(false)
    finish(1)
    await done
    expect(resolved).toBe(true)
  })

  it('goes on with the rest when an item rejects', async () => {
    const started: number[] = []
    await runPipelined(
      [1, 2],
      (item) => {
        started.push(item)
        return item === 1 ? Promise.reject(new Error('boom')) : Promise.resolve()
      },
      3,
    )
    expect(started).toEqual([1, 2])
  })

  it('does nothing for no items', async () => {
    await expect(runPipelined([], () => Promise.resolve(), 3)).resolves.toBeUndefined()
  })
})
