import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'

vi.mock('@/lib/api-client', () => ({ apiClient: { post: vi.fn() } }))

const { apiClient } = await import('@/lib/api-client')
const { LoginForm } = await import('./login-form')

function renderForm() {
  const onSuccess = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LoginForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), onSuccess }
}

async function submitCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('이메일'), 'river@modudrive.com')
  await user.type(screen.getByLabelText('비밀번호'), 'password123')
  await user.click(screen.getByRole('button', { name: '로그인' }))
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset()
    useAuthStore.setState({ status: 'anonymous', anonymousReason: null })
  })

  it('signs in right away on a device the account already verified', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ verificationRequired: false })
    const { user, onSuccess } = renderForm()

    await submitCredentials(user)

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('asks for the emailed code on a new device, then signs in once it checks out', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ verificationRequired: true })
    const { user, onSuccess } = renderForm()

    await submitCredentials(user)

    const codeInput = await screen.findByLabelText('인증 코드')
    expect(screen.getByText(/river@modudrive\.com/)).toBeInTheDocument()
    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(onSuccess).not.toHaveBeenCalled()

    vi.mocked(apiClient.post).mockResolvedValueOnce(undefined)
    await user.type(codeInput, '04a2917')
    expect(codeInput).toHaveValue('042917')
    await user.click(screen.getByRole('button', { name: '확인' }))

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/v1/auth/login/verify', { code: '042917' })
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('shows a wrong code and resends by logging in again', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ verificationRequired: true })
    const { user } = renderForm()
    await submitCredentials(user)
    await user.type(await screen.findByLabelText('인증 코드'), '000000')

    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('인증 코드가 일치하지 않습니다.'))
    await user.click(screen.getByRole('button', { name: '확인' }))
    expect(await screen.findByText('인증 코드가 일치하지 않습니다.')).toBeInTheDocument()

    vi.mocked(apiClient.post).mockResolvedValueOnce({ verificationRequired: true })
    await user.click(screen.getByRole('button', { name: '코드 다시 받기' }))

    expect(await screen.findByText('새 인증 코드를 보냈습니다.')).toBeInTheDocument()
    expect(screen.queryByText('인증 코드가 일치하지 않습니다.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('인증 코드')).toHaveValue('')
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/v1/auth/login', {
      email: 'river@modudrive.com',
      password: 'password123',
    })
  })
})
