import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UploadDropzone } from './upload-dropzone'

/** A drop whose single item is a folder the browser can't read. */
function unreadableFolderDrop() {
  const folder = {
    isFile: false,
    isDirectory: true,
    name: '잠긴폴더',
    createReader: () => ({
      readEntries: (_: unknown, reject: (error: Error) => void) => reject(new Error('NotReadableError')),
    }),
  }
  return {
    types: ['Files'],
    items: [{ kind: 'file', webkitGetAsEntry: () => folder }],
    files: [],
  }
}

describe('UploadDropzone', () => {
  it('reports a dropped folder it could not read instead of silently dropping it', async () => {
    const onUpload = vi.fn()
    const onError = vi.fn()
    render(
      <UploadDropzone onUpload={onUpload} onError={onError}>
        <p>목록</p>
      </UploadDropzone>,
    )

    fireEvent.drop(screen.getByText('목록'), { dataTransfer: unreadableFolderDrop() })

    await waitFor(() => expect(onError).toHaveBeenCalledWith('놓은 폴더를 읽지 못했습니다. 다시 시도해 주세요.'))
    expect(onUpload).not.toHaveBeenCalled()
  })
})
