import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSortState } from './use-sort-state'

describe('useSortState', () => {
  it('flips the direction when the active column is clicked again', () => {
    const { result } = renderHook(() => useSortState('date', 'desc'))

    act(() => result.current.toggleSort('date'))

    expect(result.current.sortField).toBe('date')
    expect(result.current.sortDir).toBe('asc')
    expect(result.current.touched).toBe(true)
  })

  it('switches column in the direction dirFor picks', () => {
    const { result } = renderHook(() =>
      useSortState<'name' | 'size'>('size', 'desc', (field) => (field === 'name' ? 'asc' : 'desc')),
    )

    act(() => result.current.toggleSort('name'))
    expect(result.current).toMatchObject({ sortField: 'name', sortDir: 'asc' })

    act(() => result.current.toggleSort('size'))
    expect(result.current).toMatchObject({ sortField: 'size', sortDir: 'desc' })
  })

  it('starts untouched', () => {
    const { result } = renderHook(() => useSortState('date', 'desc'))

    expect(result.current.touched).toBe(false)
  })
})
