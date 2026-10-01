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

  it('signs in when the API answers without a body (before new-device verification existed)', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(undefined)
    const { user, onSuccess } = renderForm()

    await submitCredentials(user)

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('waits for the member to send the code on a new device, then signs in once it checks out', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ verificationRequired: true })
    const { user, onSuccess } = renderForm()

    await submitCredentials(user)

    // Nothing is mailed until the member asks with 인증.
    expect(screen.getByText('가입하신 이메일로 인증 코드를 받아 인증해 주세요.')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('river@modudrive.com')).toBeInTheDocument()
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('인증 코드')).not.toBeInTheDocument()
    expect(useAuthStore.getState().status).toBe('anonymous')

    vi.mocked(apiClient.post).mockResolvedValueOnce(undefined)
    await user.click(screen.getByRole('button', { name: '인증' }))

    const codeInput = await screen.findByLabelText('인증 코드')
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/v1/auth/login/code')
    // The 5-minute countdown sits inside the code field, like the signup form's.
    expect(screen.getByText(/^[45]:\d{2}$/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '재전송' })).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()

    vi.mocked(apiClient.post).mockResolvedValueOnce(undefined)
    await user.type(codeInput, '04a2917')
    expect(codeInput).toHaveValue('042917')
    await user.click(screen.getByRole('button', { name: '확인' }))

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/v1/auth/login/verify', { code: '042917' })
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('shows a wrong code and clears it on resend', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ verificationRequired: true })
    const { user } = renderForm()
    await submitCredentials(user)
    vi.mocked(apiClient.post).mockResolvedValueOnce(undefined)
    await user.click(await screen.findByRole('button', { name: '인증' }))
    await user.type(await screen.findByLabelText('인증 코드'), '000000')

    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('인증 코드가 일치하지 않습니다.'))
    await user.click(screen.getByRole('button', { name: '확인' }))
    expect(await screen.findByText('인증 코드가 일치하지 않습니다.')).toBeInTheDocument()

    vi.mocked(apiClient.post).mockResolvedValueOnce(undefined)
    await user.click(screen.getByRole('button', { name: '재전송' }))

    await vi.waitFor(() =>
      expect(screen.queryByText('인증 코드가 일치하지 않습니다.')).not.toBeInTheDocument(),
    )
    expect(screen.getByLabelText('인증 코드')).toHaveValue('')
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/v1/auth/login/code')
  })

  it('shows why a send was refused', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ verificationRequired: true })
    const { user } = renderForm()
    await submitCredentials(user)

    vi.mocked(apiClient.post).mockRejectedValueOnce(
      new Error('요청 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.'),
    )
    await user.click(await screen.findByRole('button', { name: '인증' }))

    expect(await screen.findByText('요청 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
    expect(screen.queryByLabelText('인증 코드')).not.toBeInTheDocument()
  })

  it('drops the code field once the wrong codes are used up (410) and asks for a resend', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ verificationRequired: true })
    const { user } = renderForm()
    await submitCredentials(user)
    vi.mocked(apiClient.post).mockResolvedValueOnce(undefined)
    await user.click(await screen.findByRole('button', { name: '인증' }))
    await user.type(await screen.findByLabelText('인증 코드'), '000000')

    const ended = Object.assign(
      new Error('인증 코드 입력 횟수를 초과했습니다. 코드를 다시 받아 주세요.'),
      { status: 410 },
    )
    vi.mocked(apiClient.post).mockRejectedValueOnce(ended)
    await user.click(screen.getByRole('button', { name: '확인' }))

    expect(
      await screen.findByText('인증 코드 입력 횟수를 초과했습니다. 코드를 다시 받아 주세요.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('인증 코드')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '재전송' })).toBeEnabled()
  })
})
