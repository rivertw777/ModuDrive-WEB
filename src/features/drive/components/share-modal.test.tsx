import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
  inheritedLinks: [],
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
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ShareModal open onClose={onClose} fileId="file-1" fileName="report.pdf" />
    </QueryClientProvider>,
  )
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

  it('shows the link role as a fixed 뷰어 label once LINK is staged', async () => {
    renderModal()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByRole('combobox'), 'LINK')

    expect(screen.getByText('링크 권한')).toBeInTheDocument()
    expect(screen.getByText('뷰어')).toBeInTheDocument()
  })

  it('sends the staged scope with a VIEWER link role on 완료', async () => {
    renderModal()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByRole('combobox'), 'LINK')
    await user.click(screen.getByRole('button', { name: '완료' }))

    expect(scopeMutate).toHaveBeenCalledWith({ fileId: 'file-1', scope: 'LINK', role: 'VIEWER' })
  })

  it('omits the role when the scope goes back to RESTRICTED', async () => {
    renderModal({ scope: 'LINK', role: 'VIEWER', linkToken: 'tok-1' })
    const user = userEvent.setup()

    await user.selectOptions(screen.getByRole('combobox'), 'RESTRICTED')
    await user.click(screen.getByRole('button', { name: '완료' }))

    expect(scopeMutate).toHaveBeenCalledWith({
      fileId: 'file-1',
      scope: 'RESTRICTED',
      role: undefined,
    })
  })

  it('shows LINK as the effective scope when a parent folder link is inherited', () => {
    renderModal({ inheritedLinks: [{ fileId: 'folder-1', name: '새 폴더', role: 'VIEWER' }] })

    expect(screen.getByRole('combobox')).toHaveValue('LINK')
  })

  it('restricting an inherited-link file turns the parent folder link off instead', async () => {
    renderModal({ inheritedLinks: [{ fileId: 'folder-1', name: '새 폴더', role: 'VIEWER' }] })
    const user = userEvent.setup()

    await user.selectOptions(screen.getByRole('combobox'), 'RESTRICTED')
    // The staged scope must NOT change — a confirm dialog opens instead.
    expect(screen.getByText('상위 폴더의 액세스 권한을 삭제하시겠습니까?')).toBeInTheDocument()
    expect(scopeMutate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '상위 항목에서 삭제' }))

    expect(scopeMutate).toHaveBeenCalledWith({
      fileId: 'folder-1',
      scope: 'RESTRICTED',
      role: undefined,
    })
  })
})
