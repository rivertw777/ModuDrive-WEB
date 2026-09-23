import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UploadButton } from './upload-button'

describe('UploadButton', () => {
  it('offers file and folder upload, the folder input picking a whole directory', async () => {
    render(<UploadButton onUpload={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: '업로드' }))

    expect(screen.getByRole('button', { name: '파일 업로드' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '폴더 업로드' })).toBeInTheDocument()
    expect(screen.getByTestId('upload-folder-input')).toHaveAttribute('webkitdirectory')
    expect(screen.getByTestId('upload-file-input')).not.toHaveAttribute('webkitdirectory')
  })

  it('hands a folder pick over with each file’s path inside the folder', async () => {
    const onUpload = vi.fn()
    render(<UploadButton onUpload={onUpload} />)
    const picked = new File(['x'], 'a.jpg')
    Object.defineProperty(picked, 'webkitRelativePath', { value: '사진/a.jpg' })

    await userEvent.upload(screen.getByTestId('upload-folder-input'), picked)

    expect(onUpload).toHaveBeenCalledWith([{ relativePath: '사진/a.jpg', file: picked }])
  })
})
