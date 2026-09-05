import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { clampPoint, useRowSelection } from './use-row-selection'

describe('clampPoint', () => {
  const bounds = { left: 10, top: 10, right: 100, bottom: 100 }

  it('leaves a point inside the bounds untouched', () => {
    expect(clampPoint(50, 50, bounds)).toEqual({ x: 50, y: 50 })
  })

  it('clamps a point outside each edge to that edge', () => {
    expect(clampPoint(-5, -5, bounds)).toEqual({ x: 10, y: 10 })
    expect(clampPoint(500, 500, bounds)).toEqual({ x: 100, y: 100 })
  })

  it('clamps to the visible viewport even when the container itself extends above it', () => {
    // visibleBounds() intersects the (possibly scrolled, taller-than-viewport) container
    // with its scrollport ancestor, so `top` here is the scrollport's edge (e.g. below a
    // header), not the container's own — a point dragged up over the header must snap to it.
    const bounds = { left: 0, top: 50, right: 1000, bottom: 800 }
    expect(clampPoint(20, 20, bounds)).toEqual({ x: 20, y: 50 })
  })
})

describe('useRowSelection onEmpty', () => {
  const ref = { current: null }

  it('does not fire on mount, even under StrictMode double-invoke', () => {
    const onEmpty = vi.fn()
    renderHook(() => useRowSelection(ref, ['a', 'b'], onEmpty), { wrapper: StrictMode })
    expect(onEmpty).not.toHaveBeenCalled()
  })

  it('fires once selection actually transitions from non-empty to empty', () => {
    const onEmpty = vi.fn()
    const { result } = renderHook(() => useRowSelection(ref, ['a', 'b'], onEmpty))

    act(() => result.current.setSelected(new Set(['a'])))
    expect(onEmpty).not.toHaveBeenCalled()

    act(() => result.current.setSelected(new Set()))
    expect(onEmpty).toHaveBeenCalledTimes(1)
  })
})
