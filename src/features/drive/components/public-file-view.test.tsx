import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PublicFileView } from './public-file-view'
import type { PublicFile } from '../types'

vi.mock('../api/get-public-file', () => ({
  usePublicFile: vi.fn(),
}))

const { usePublicFile } = await import('../api/get-public-file')

const file: PublicFile = {
  fileId: 'file-1',
  name: 'report.pdf',
  fileSize: 2048,
  directory: false,
  updatedAt: '2026-08-01T00:00:00',
}

describe('PublicFileView', () => {
  it('renders read-only file info with no edit affordances', () => {
    vi.mocked(usePublicFile).mockReturnValue({ data: file, isLoading: false, isError: false } as ReturnType<
      typeof usePublicFile
    >)

    render(<PublicFileView token="tok-1" />)

    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
