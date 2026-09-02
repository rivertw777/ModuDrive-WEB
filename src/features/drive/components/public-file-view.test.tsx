import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PublicFileView } from './public-file-view'
import type { PublicFile } from '../types'

vi.mock('../api/get-public-file', () => ({
  usePublicFile: vi.fn(),
  usePublicChildren: vi.fn(),
}))
vi.mock('../api/download-public-file', () => ({
  downloadPublicFile: vi.fn(),
}))

const { usePublicFile, usePublicChildren } = await import('../api/get-public-file')
const { downloadPublicFile } = await import('../api/download-public-file')

const file: PublicFile = {
  fileId: 'file-1',
  name: 'report.pdf',
  fileSize: 2048,
  directory: false,
  updatedAt: '2026-08-01T00:00:00',
}

function renderView(data: PublicFile = file, children: PublicFile[] = []) {
  vi.mocked(usePublicFile).mockReturnValue({ data, isLoading: false, isError: false } as ReturnType<
    typeof usePublicFile
  >)
  vi.mocked(usePublicChildren).mockReturnValue({
    data: children,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof usePublicChildren>)
  render(
    <MemoryRouter>
      <PublicFileView token="tok-1" />
    </MemoryRouter>,
  )
}

describe('PublicFileView', () => {
  it('renders read-only file info with no edit affordances', () => {
    renderView()

    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /이름/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('downloads through the anonymous endpoint when 다운로드 is clicked', async () => {
    renderView()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '다운로드' }))

    expect(downloadPublicFile).toHaveBeenCalledWith('tok-1', 'report.pdf')
  })

  it('browses a shared folder and downloads a nested file by its entry id', async () => {
    const child: PublicFile = {
      fileId: 'child-1',
      name: 'nested.txt',
      fileSize: 12,
      directory: false,
      updatedAt: null,
    }
    renderView({ ...file, directory: true, name: 'photos' }, [child])
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: 'photos' })).toBeInTheDocument()
    expect(screen.getByText('nested.txt')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'nested.txt 다운로드' }))

    expect(downloadPublicFile).toHaveBeenCalledWith('tok-1', 'nested.txt', 'child-1')
  })
})
