import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareModal } from './share-modal'
import type { FileAccessList } from '../types'

vi.mock('../api/list-file-shares', () => ({ useFileShares: vi.fn() }))
vi.mock('@/features/auth', () => ({ useCurrentMember: vi.fn() }))
vi.mock('../api/update-file-scope', () => ({ useUpdateFileScope: vi.fn() }))
vi.mock('../api/update-file-share-role', () => ({ useUpdateFileShareRole: vi.fn() }))
vi.mock('../api/revoke-file-share', () => ({ useRevokeFileShare: vi.fn() }))

const { useFileShares } = await import('../api/list-file-shares')
const { useCurrentMember } = await import('@/features/auth')
const { useUpdateFileScope } = await import('../api/update-file-scope')
const { useUpdateFileShareRole } = await import('../api/update-file-share-role')
const { useRevokeFileShare } = await import('../api/revoke-file-share')

const access: FileAccessList = {
  fileId: 'file-1',
  ownerId: 'owner-1',
  scope: 'RESTRICTED',
  role: null,
  linkToken: null,
  shares: [],
}

const scopeMutate = vi.fn()

function renderModal(overrides: Partial<FileAccessList> = {}) {
  vi.mocked(useFileShares).mockReturnValue({
    data: { ...access, ...overrides },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useFileShares>)
  vi.mocked(useCurrentMember).mockReturnValue({
    data: { id: 'owner-1', name: 'river', email: 'river@modudrive.com' },
  } as ReturnType<typeof useCurrentMember>)
  const idle = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }
  vi.mocked(useUpdateFileScope).mockReturnValue({
    mutateAsync: scopeMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateFileScope>)
  vi.mocked(useUpdateFileShareRole).mockReturnValue(
    idle as unknown as ReturnType<typeof useUpdateFileShareRole>,
  )
  vi.mocked(useRevokeFileShare).mockReturnValue(
    idle as unknown as ReturnType<typeof useRevokeFileShare>,
  )
  const onClose = vi.fn()
  render(<ShareModal open onClose={onClose} fileId="file-1" fileName="report.pdf" />)
  return { onClose }
}

describe('ShareModal', () => {
  beforeEach(() => {
    scopeMutate.mockReset().mockResolvedValue(undefined)
  })

  it('hides the link role select while the scope is RESTRICTED', () => {
    renderModal()

    expect(screen.queryByText('링크 권한')).not.toBeInTheDocument()
  })

  it('shows the link role select once LINK is staged, defaulting to 뷰어', async () => {
    renderModal()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByRole('combobox'), 'LINK')

    expect(screen.getByText('링크 권한')).toBeInTheDocument()
    expect(screen.getByDisplayValue('뷰어')).toBeInTheDocument()
  })

  it('seeds the link role select from the saved role', () => {
    renderModal({ scope: 'LINK', role: 'EDITOR', linkToken: 'tok-1' })

    expect(screen.getByDisplayValue('편집자')).toBeInTheDocument()
  })

  it('sends the staged scope and link role together on 완료', async () => {
    renderModal()
    const user = userEvent.setup()

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'LINK')
    await user.selectOptions(screen.getByDisplayValue('뷰어'), 'EDITOR')
    await user.click(screen.getByRole('button', { name: '완료' }))

    expect(scopeMutate).toHaveBeenCalledWith({ fileId: 'file-1', scope: 'LINK', role: 'EDITOR' })
  })

  it('sends a link role change alone, without a scope change', async () => {
    renderModal({ scope: 'LINK', role: 'VIEWER', linkToken: 'tok-1' })
    const user = userEvent.setup()

    await user.selectOptions(screen.getByDisplayValue('뷰어'), 'EDITOR')
    await user.click(screen.getByRole('button', { name: '완료' }))

    expect(scopeMutate).toHaveBeenCalledWith({ fileId: 'file-1', scope: 'LINK', role: 'EDITOR' })
  })

  it('omits the role when the scope goes back to RESTRICTED', async () => {
    renderModal({ scope: 'LINK', role: 'EDITOR', linkToken: 'tok-1' })
    const user = userEvent.setup()

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'RESTRICTED')
    await user.click(screen.getByRole('button', { name: '완료' }))

    expect(scopeMutate).toHaveBeenCalledWith({
      fileId: 'file-1',
      scope: 'RESTRICTED',
      role: undefined,
    })
  })
})
