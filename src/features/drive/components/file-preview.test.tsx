import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FilePreview } from './file-preview'

vi.mock('../api/view-file', () => ({ viewFile: vi.fn() }))
vi.mock('../api/view-public-file', () => ({ viewPublicFile: vi.fn() }))

const { viewFile } = await import('../api/view-file')
const { viewPublicFile } = await import('../api/view-public-file')

beforeEach(() => {
  vi.mocked(viewFile).mockReset()
  vi.mocked(viewPublicFile).mockReset()
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('FilePreview', () => {
  it('renders nothing for a non-previewable file', () => {
    const { container } = render(
      <FilePreview
        fileName="report.pdf"
        fileSize={1024}
        source={{ type: 'auth', fileId: 'f-1' }}
      />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(viewFile).not.toHaveBeenCalled()
  })

  it('renders nothing for a file over the preview size cap', () => {
    const { container } = render(
      <FilePreview
        fileName="huge.png"
        fileSize={20 * 1024 * 1024}
        source={{ type: 'auth', fileId: 'f-1' }}
      />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(viewFile).not.toHaveBeenCalled()
  })

  it('renders an image via the authenticated source', async () => {
    vi.mocked(viewFile).mockResolvedValue('blob:mock-image')

    render(
      <FilePreview fileName="photo.png" fileSize={1024} source={{ type: 'auth', fileId: 'f-1' }} />,
    )

    await waitFor(() =>
      expect(screen.getByAltText('photo.png')).toHaveAttribute('src', 'blob:mock-image'),
    )
    expect(viewFile).toHaveBeenCalledWith('f-1', 'photo.png')
  })

  it('revokes the object URL on unmount', async () => {
    vi.mocked(viewFile).mockResolvedValue('blob:mock-image')

    const { unmount } = render(
      <FilePreview fileName="photo.png" fileSize={1024} source={{ type: 'auth', fileId: 'f-1' }} />,
    )
    await screen.findByAltText('photo.png')
    unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-image')
  })

  it('renders a video via the public link source', async () => {
    vi.mocked(viewPublicFile).mockResolvedValue('blob:mock-video')

    const { container } = render(
      <FilePreview
        fileName="clip.mp4"
        fileSize={1024}
        source={{ type: 'public', token: 'tok-1' }}
      />,
    )

    await waitFor(() =>
      expect(container.querySelector('video')).toHaveAttribute('src', 'blob:mock-video'),
    )
    expect(viewPublicFile).toHaveBeenCalledWith('tok-1', 'clip.mp4')
  })

  it('renders audio controls', async () => {
    vi.mocked(viewFile).mockResolvedValue('blob:mock-audio')

    const { container } = render(
      <FilePreview fileName="song.mp3" fileSize={1024} source={{ type: 'auth', fileId: 'f-1' }} />,
    )

    await waitFor(() =>
      expect(container.querySelector('audio')).toHaveAttribute('src', 'blob:mock-audio'),
    )
  })

  it('renders fetched text content for a .txt file', async () => {
    vi.mocked(viewFile).mockResolvedValue('blob:mock-text')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ text: () => Promise.resolve('hello world') }),
    )

    render(
      <FilePreview fileName="notes.txt" fileSize={1024} source={{ type: 'auth', fileId: 'f-1' }} />,
    )

    await waitFor(() => expect(screen.getByText('hello world')).toBeInTheDocument())
  })

  it('renders nothing for an svg file (no safe inline preview)', () => {
    const { container } = render(
      <FilePreview fileName="icon.svg" fileSize={1024} source={{ type: 'auth', fileId: 'f-1' }} />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(viewFile).not.toHaveBeenCalled()
  })

  it('shows an error state when the fetch fails', async () => {
    vi.mocked(viewFile).mockRejectedValue(new Error('network error'))

    render(
      <FilePreview fileName="photo.png" fileSize={1024} source={{ type: 'auth', fileId: 'f-1' }} />,
    )

    await waitFor(() =>
      expect(screen.getByText('미리보기를 불러오지 못했습니다')).toBeInTheDocument(),
    )
  })
})
