/**
 * Runs `run` over `items` in order as a pipeline: the next item starts once the one before it calls
 * its `ready` (or ends), and never while `limit` items are still running. So the upload's next group
 * gets its commit and URLs done while the previous group's last blocks go, instead of starting at a
 * fixed time that lets groups fall into step and leave the block PUTs idle together.
 * An item that rejects ends like one that resolves — the rest still run — so `run` should catch and
 * report its own failures (the upload's groups do).
 */
export async function runPipelined<T>(
  items: T[],
  run: (item: T, ready: () => void) => Promise<void>,
  limit: number,
): Promise<void> {
  limit = Math.max(1, limit)
  const running = new Set<Promise<void>>()
  for (const item of items) {
    let ready = () => {}
    const mayStartNext = new Promise<void>((resolve) => (ready = resolve))
    const task: Promise<void> = Promise.resolve()
      .then(() => run(item, ready))
      .catch(() => {})
      .finally(() => {
        ready()
        running.delete(task)
      })
    running.add(task)
    await mayStartNext
    while (running.size >= limit) await Promise.race(running)
  }
  await Promise.all(running)
}
