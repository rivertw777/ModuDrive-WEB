import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UploadConflictDialog } from './upload-conflict-dialog'

function setup(name: string | null = 'report.pdf') {
  const onResolve = vi.fn()
  const view = render(<UploadConflictDialog name={name} onResolve={onResolve} />)
  return { onResolve, rerender: view.rerender }
}

describe('UploadConflictDialog', () => {
  it('names the conflicting file and defaults to replacing it', () => {
    setup()
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /기존 파일 대체/ })).toBeChecked()
  })

  it('resolves with "replace" on 업로드 without changing the selection', async () => {
    const { onResolve } = setup()
    await userEvent.click(screen.getByRole('button', { name: '업로드' }))
    expect(onResolve).toHaveBeenCalledWith('replace')
  })

  it('resolves with "keep-both" once that option is picked', async () => {
    const { onResolve } = setup()
    await userEvent.click(screen.getByRole('radio', { name: /두 파일 모두 유지/ }))
    await userEvent.click(screen.getByRole('button', { name: '업로드' }))
    expect(onResolve).toHaveBeenCalledWith('keep-both')
  })

  it('resolves with null on 취소', async () => {
    const { onResolve } = setup()
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onResolve).toHaveBeenCalledWith(null)
  })

  it('reopens with the default selection instead of the previous file’s answer', async () => {
    const { onResolve, rerender } = setup()
    await userEvent.click(screen.getByRole('radio', { name: /두 파일 모두 유지/ }))

    rerender(<UploadConflictDialog name={null} onResolve={onResolve} />)
    rerender(<UploadConflictDialog name="other.pdf" onResolve={onResolve} />)

    expect(screen.getByRole('radio', { name: /기존 파일 대체/ })).toBeChecked()
  })
})
