import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

/** How many rows to reveal per scroll step in {@link useWindowedList}. */
export const WINDOW_PAGE_SIZE = 100

/**
 * Returns a callback ref for a sentinel element; calls `onLoadMore` whenever that element
 * scrolls into view (and isn't already `loading`). The shared "load the next page when the
 * sentinel appears" wiring for both client-side windowing and server-side cursor pagination.
 *
 * A callback ref (not `useRef`) so the observer re-binds if the sentinel node is remounted
 * while `hasMore` stays true. `onLoadMore`/`loading` are read through a ref so a changing
 * callback doesn't tear down and recreate the observer.
 */
export function useInfiniteScrollRef(
  hasMore: boolean,
  onLoadMore: () => void,
  loading = false,
) {
  const latest = useRef({ onLoadMore, loading })
  useLayoutEffect(() => {
    latest.current = { onLoadMore, loading }
  })

  const [node, setNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!hasMore || !node) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !latest.current.loading) latest.current.onLoadMore()
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, node])

  return setNode
}

/**
 * Client-side "infinite scroll": renders the first {@link WINDOW_PAGE_SIZE} items and reveals
 * another page each time the sentinel scrolls into view. The list itself already arrived in
 * full — this only caps how many rows paint at once. `resetKey` collapses the window back to
 * one page when it changes (e.g. the sort order flips).
 */
export function useWindowedList<T>(items: T[], resetKey?: unknown) {
  const [count, setCount] = useState(WINDOW_PAGE_SIZE)
  const [prevKey, setPrevKey] = useState(resetKey)
  if (prevKey !== resetKey) {
    setPrevKey(resetKey)
    setCount(WINDOW_PAGE_SIZE)
  }

  const hasMore = count < items.length
  const sentinelRef = useInfiniteScrollRef(hasMore, () => setCount((c) => c + WINDOW_PAGE_SIZE))

  const visible = useMemo(() => items.slice(0, count), [items, count])
  return { visible, hasMore, sentinelRef }
}
