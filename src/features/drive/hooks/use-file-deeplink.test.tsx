import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useFileDeeplink } from './use-file-deeplink'

function renderDeeplink(initialPath: string) {
  let hook: ReturnType<typeof useFileDeeplink>
  function Probe() {
    hook = useFileDeeplink()
    return null
  }
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Probe />
    </MemoryRouter>,
  )
  return () => hook
}

describe('useFileDeeplink', () => {
  it('seeds selectedFileId from ?file=', () => {
    const getHook = renderDeeplink('/shared?file=f-1')
    expect(getHook().selectedFileId).toBe('f-1')
  })

  it('has no selection when there is no ?file= param', () => {
    const getHook = renderDeeplink('/shared')
    expect(getHook().selectedFileId).toBeNull()
  })
})
