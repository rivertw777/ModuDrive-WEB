import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useForceLightMode } from './use-force-light-mode'

function TestComponent() {
  useForceLightMode()
  return null
}

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('useForceLightMode', () => {
  it('removes the dark class while mounted and restores it on unmount', () => {
    document.documentElement.classList.add('dark')

    const { unmount } = render(<TestComponent />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    unmount()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('leaves light mode as light mode after unmount', () => {
    document.documentElement.classList.remove('dark')

    const { unmount } = render(<TestComponent />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    unmount()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
