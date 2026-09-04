import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddMemberForm } from './add-member-form'

vi.mock('../api/check-member-email', () => ({ memberExistsByEmail: vi.fn() }))
vi.mock('../api/share-file', () => ({ useShareFile: vi.fn() }))

const { memberExistsByEmail } = await import('../api/check-member-email')
const { useShareFile } = await import('../api/share-file')

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
  beforeEach(() => {
    // Every email is a registered member and the share succeeds, unless a test overrides these.
    vi.mocked(memberExistsByEmail).mockReset().mockResolvedValue(true)
    vi.mocked(useShareFile).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(null),
      isPending: false,
    } as unknown as ReturnType<typeof useShareFile>)
  })

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

  it('shares directly when the email belongs to a ModuDrive member', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(null)
    vi.mocked(useShareFile).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useShareFile>)
    const { onDone } = renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('이메일 입력 후 Enter'), 'river@modudrive.com{Enter}')
    await user.click(screen.getByRole('button', { name: '전송' }))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ fileId: 'file-1', email: 'river@modudrive.com', role: 'VIEWER' }),
    )
    expect(onDone).toHaveBeenCalled()
  })

  it('warns before sharing to an email with no ModuDrive account, and shares on confirm', async () => {
    vi.mocked(memberExistsByEmail).mockResolvedValue(false)
    const mutateAsync = vi.fn().mockResolvedValue(null)
    vi.mocked(useShareFile).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useShareFile>)
    const { onDone } = renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('이메일 입력 후 Enter'), 'guest@example.com{Enter}')
    await user.click(screen.getByRole('button', { name: '전송' }))

    expect(await screen.findByText(/ModuDrive 이외의 계정과 공유하시겠습니까/)).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '무시하고 공유' }))

    expect(mutateAsync).toHaveBeenCalledWith({ fileId: 'file-1', email: 'guest@example.com', role: 'VIEWER' })
    expect(onDone).toHaveBeenCalled()
  })

  it('cancelling the guest warning leaves the share unsent', async () => {
    vi.mocked(memberExistsByEmail).mockResolvedValue(false)
    const mutateAsync = vi.fn().mockResolvedValue(null)
    vi.mocked(useShareFile).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useShareFile>)
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('이메일 입력 후 Enter'), 'guest@example.com{Enter}')
    await user.click(screen.getByRole('button', { name: '전송' }))
    expect(await screen.findByText(/ModuDrive 이외의 계정과 공유하시겠습니까/)).toBeInTheDocument()

    // Two "취소" buttons exist while the guest-warning dialog is open (the form's own,
    // and the dialog's) — the dialog's is the one rendered last.
    const cancelButtons = screen.getAllByRole('button', { name: '취소' })
    await user.click(cancelButtons[cancelButtons.length - 1])

    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
