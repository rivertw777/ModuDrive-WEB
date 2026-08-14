import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { AddMemberForm } from './add-member-form'

function renderForm(onCancel = vi.fn(), onDone = vi.fn()) {
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <AddMemberForm fileId="file-1" onCancel={onCancel} onDone={onDone} />
    </QueryClientProvider>,
  )
  return { onCancel, onDone }
}

describe('AddMemberForm', () => {
  it('blocks submit and shows an error for an invalid email', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('이메일 입력 후 Enter'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: '전송' }))

    expect(await screen.findByText('유효한 이메일이 아닙니다: not-an-email')).toBeInTheDocument()
  })

  it('commits an email as a chip on Enter, removable via its × button', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('이메일 입력 후 Enter'), 'river@modudrive.com{Enter}')
    expect(screen.getByText('river@modudrive.com')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'river@modudrive.com 제거' }))
    expect(screen.queryByText('river@modudrive.com')).not.toBeInTheDocument()
  })

  it('calls onCancel when 취소 is clicked', async () => {
    const { onCancel } = renderForm()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
