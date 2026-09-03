import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInfiniteScrollRef, useWindowedList, WINDOW_PAGE_SIZE } from './use-windowed-list'

// jsdom has no IntersectionObserver — capture the callback so a test can fire it, and count
// observe/disconnect so re-bind behaviour can be asserted.
let ioCallback: IntersectionObserverCallback | null = null
let observeCount = 0
let disconnectCount = 0

beforeEach(() => {
  ioCallback = null
  observeCount = 0
  disconnectCount = 0
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        ioCallback = cb
      }
      observe() {
        observeCount++
      }
      disconnect() {
        disconnectCount++
      }
      unobserve() {}
      takeRecords() {
        return []
      }
    },
  )
})

afterEach(() => vi.unstubAllGlobals())

const scrollToSentinel = () =>
  act(() => {
    ioCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
  })

function Harness({ total, resetKey }: { total: number; resetKey?: unknown }) {
  const items = Array.from({ length: total }, (_, i) => i)
  const { visible, hasMore, sentinelRef } = useWindowedList(items, resetKey)
  return (
    <>
      <span data-testid="count">{visible.length}</span>
      <span data-testid="more">{String(hasMore)}</span>
      {hasMore && <div ref={sentinelRef} data-testid="sentinel" />}
    </>
  )
}

const count = () => Number(screen.getByTestId('count').textContent)

describe('useWindowedList', () => {
  it('shows only the first page and flags there is more', () => {
    render(<Harness total={250} />)
    expect(count()).toBe(WINDOW_PAGE_SIZE)
    expect(screen.getByTestId('more').textContent).toBe('true')
  })

  it('reveals another page each time the sentinel scrolls into view', () => {
    render(<Harness total={250} />)
    scrollToSentinel()
    expect(count()).toBe(WINDOW_PAGE_SIZE * 2)
    scrollToSentinel()
    expect(count()).toBe(250)
    expect(screen.getByTestId('more').textContent).toBe('false')
  })

  it('never reveals more than the list length', () => {
    render(<Harness total={30} />)
    expect(count()).toBe(30)
    expect(screen.getByTestId('more').textContent).toBe('false')
  })

  it('collapses back to one page when resetKey changes', () => {
    const { rerender } = render(<Harness total={250} resetKey="name:asc" />)
    scrollToSentinel()
    expect(count()).toBe(WINDOW_PAGE_SIZE * 2)
    rerender(<Harness total={250} resetKey="name:desc" />)
    expect(count()).toBe(WINDOW_PAGE_SIZE)
  })
})

function ScrollHarness({
  hasMore,
  onLoadMore,
  loading = false,
  mounted = true,
}: {
  hasMore: boolean
  onLoadMore: () => void
  loading?: boolean
  mounted?: boolean
}) {
  const ref = useInfiniteScrollRef(hasMore, onLoadMore, loading)
  return mounted ? <div ref={ref} data-testid="sentinel" /> : null
}

describe('useInfiniteScrollRef', () => {
  it('calls onLoadMore when the sentinel intersects', () => {
    const onLoadMore = vi.fn()
    render(<ScrollHarness hasMore onLoadMore={onLoadMore} />)
    scrollToSentinel()
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('does not call onLoadMore while loading', () => {
    const onLoadMore = vi.fn()
    render(<ScrollHarness hasMore onLoadMore={onLoadMore} loading />)
    scrollToSentinel()
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('disconnects the observer when the sentinel unmounts', () => {
    const { rerender } = render(<ScrollHarness hasMore onLoadMore={vi.fn()} />)
    expect(observeCount).toBe(1)
    rerender(<ScrollHarness hasMore onLoadMore={vi.fn()} mounted={false} />)
    expect(disconnectCount).toBe(1)
  })

  it('re-observes when the sentinel node is remounted while hasMore stays true', () => {
    const { rerender } = render(<ScrollHarness hasMore onLoadMore={vi.fn()} />)
    expect(observeCount).toBe(1)
    rerender(<ScrollHarness hasMore onLoadMore={vi.fn()} mounted={false} />)
    rerender(<ScrollHarness hasMore onLoadMore={vi.fn()} mounted />)
    expect(observeCount).toBe(2)
  })
})
