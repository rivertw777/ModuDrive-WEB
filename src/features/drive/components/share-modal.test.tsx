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
const revokeMutate = vi.fn()

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
  vi.mocked(useRevokeFileShare).mockReturnValue({
    mutateAsync: revokeMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useRevokeFileShare>)
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
    revokeMutate.mockReset().mockResolvedValue(undefined)
  })

  it('hides the link role badge while the scope is RESTRICTED', () => {
    renderModal()

    expect(screen.queryByTestId('link-role-badge')).not.toBeInTheDocument()
  })

  it('shows the link role as a fixed 뷰어 badge once LINK is staged', async () => {
    renderModal()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByRole('combobox'), 'LINK')

    expect(screen.getByTestId('link-role-badge')).toHaveTextContent('뷰어')
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

  it('builds the anonymous link as /public/:fileId?key=<linkToken>', async () => {
    renderModal({ scope: 'LINK', role: 'VIEWER', linkToken: 'tok-1' })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '링크 복사' }))

    expect(await navigator.clipboard.readText()).toBe(
      'http://localhost:3000/public/file-1?key=tok-1',
    )
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

  describe('when a member also has a separate grant on an ancestor folder', () => {
    const sharesWithInherited: FileAccessList['shares'] = [
      {
        shareId: 'share-a',
        fileId: 'file-1',
        ownerId: 'owner-1',
        sharedWithUserId: 'grantee-1',
        role: 'EDITOR',
        sharedWithEmail: 'grantee@modudrive.com',
        sharedWithName: null,
        inheritedFrom: null,
      },
      {
        shareId: 'share-b',
        fileId: 'folder-1',
        ownerId: 'owner-1',
        sharedWithUserId: 'grantee-1',
        role: 'VIEWER',
        sharedWithEmail: 'grantee@modudrive.com',
        sharedWithName: null,
        inheritedFrom: { fileId: 'folder-1', name: '새 폴더' },
      },
    ]

    it('warns before removing a direct share that an ancestor grant would still cover, and cascades on confirm', async () => {
      renderModal({ shares: sharesWithInherited })
      const user = userEvent.setup()

      // combobox[0] is the scope select; the direct row (share-a) is the only editable member row.
      await user.selectOptions(screen.getAllByRole('combobox')[1], '삭제')

      expect(screen.getByText('상위 폴더에서 삭제하시겠습니까?')).toBeInTheDocument()
      expect(revokeMutate).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: '상위 항목에서 삭제' }))
      await user.click(screen.getByRole('button', { name: '완료' }))

      expect(revokeMutate).toHaveBeenCalledWith({ fileId: 'file-1', shareId: 'share-a' })
      expect(revokeMutate).toHaveBeenCalledWith({ fileId: 'folder-1', shareId: 'share-b' })
    })

    it('leaves everything unchanged when the cascade dialog is cancelled', async () => {
      renderModal({ shares: sharesWithInherited })
      const user = userEvent.setup()

      await user.selectOptions(screen.getAllByRole('combobox')[1], '삭제')
      await user.click(screen.getByRole('button', { name: '취소' }))

      // The dialog's own confirm button is gone now that it's closed (a closed native <dialog>'s
      // content drops out of the accessibility tree, unlike a plain text query on its markup).
      expect(screen.queryByRole('button', { name: '상위 항목에서 삭제' })).not.toBeInTheDocument()
      // Nothing staged — the row's select reverts to the original role, not "삭제".
      expect(screen.getAllByRole('combobox')[1]).toHaveValue('EDITOR')

      await user.click(screen.getByRole('button', { name: '완료' }))
      expect(revokeMutate).not.toHaveBeenCalled()
    })
  })
})
