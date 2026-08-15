import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { SignupForm } from './signup-form'

vi.mock('@/lib/api-client', () => ({
  apiClient: { post: vi.fn().mockResolvedValue(undefined) },
}))

function renderForm() {
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <SignupForm onSuccess={vi.fn()} />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const verifyButton = () => screen.getByRole('button', { name: '인증' })

describe('SignupForm email verification', () => {
  it('enables 인증 only for a valid email, then verifies and re-locks on email change', async () => {
    const user = renderForm()
    const email = screen.getByLabelText('이메일')

    await user.type(email, 'not-an-email')
    expect(verifyButton()).toBeDisabled()
    expect(screen.getByRole('button', { name: '회원가입' })).toBeDisabled()

    await user.clear(email)
    await user.type(email, 'river@modudrive.com')
    expect(verifyButton()).toBeEnabled()

    await user.click(verifyButton())
    await user.type(await screen.findByLabelText('인증 코드'), '123456')
    await user.click(screen.getByRole('button', { name: '확인' }))

    expect(await screen.findByText('인증 완료')).toBeInTheDocument()
    expect(screen.queryByLabelText('인증 코드')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '회원가입' })).toBeEnabled()

    await user.type(email, 'x')
    expect(screen.queryByText('인증 완료')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '회원가입' })).toBeDisabled()
  })
})
