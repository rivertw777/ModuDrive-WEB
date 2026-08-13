import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { AddMemberForm } from './add-member-form'

function renderForm() {
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <AddMemberForm fileId="file-1" />
    </QueryClientProvider>,
  )
}

describe('AddMemberForm', () => {
  it('blocks submit and shows an error for an invalid email', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('이메일로 초대'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: '초대' }))

    expect(await screen.findByText('유효한 이메일이 아닙니다')).toBeInTheDocument()
  })
})
