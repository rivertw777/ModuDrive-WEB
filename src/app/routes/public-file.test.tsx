import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PublicFileRoute from './public-file'

function Landed() {
  const location = useLocation()
  return <div>landed on {location.pathname + location.search}</div>
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/public/:fileId" element={<PublicFileRoute />} />
        <Route path="/files/:fileId" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicFileRoute (legacy alias)', () => {
  it('redirects a pre-#303 link straight to /files/:fileId, key intact', () => {
    renderAt('/public/f-1?key=k-1')

    expect(screen.getByText('landed on /files/f-1?key=k-1')).toBeInTheDocument()
  })

  it('redirects a keyless link the same way', () => {
    renderAt('/public/f-1')

    expect(screen.getByText('landed on /files/f-1')).toBeInTheDocument()
  })
})
