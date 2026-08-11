/**
 * Runs `fn` over `items` with bounded concurrency. Never rejects — failures are collected and
 * returned instead, so a batch UI action can report partial success instead of the fail-fast,
 * unbounded-fan-out behavior of `Promise.all(items.map(fn))`.
 */
export async function runBatch<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  concurrency = 4,
): Promise<T[]> {
  const queue = [...items]
  const failed: T[] = []
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        try {
          await fn(item)
        } catch {
          failed.push(item)
        }
      }
    }),
  )
  return failed
}
