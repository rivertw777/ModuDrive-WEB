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
vi.mock('../api/share-file', () => ({ useShareFile: vi.fn() }))

const { useFileShares } = await import('../api/list-file-shares')
const { useCurrentMember } = await import('@/features/auth')
const { useUpdateFileScope } = await import('../api/update-file-scope')
const { useUpdateFileShareRole } = await import('../api/update-file-share-role')
const { useRevokeFileShare } = await import('../api/revoke-file-share')
const { useShareFile } = await import('../api/share-file')

const access: FileAccessList = {
  fileId: 'file-1',
  ownerId: 'owner-1',
  scope: 'RESTRICTED',
  role: null,
  linkToken: null,
  shares: [],
  inheritedLinks: [],
  hasSharedDescendant: false,
}

const scopeMutate = vi.fn()
const revokeMutate = vi.fn()
const updateRoleMutate = vi.fn()
const createShareMutate = vi.fn()

function renderModal(overrides: Partial<FileAccessList> = {}) {
  vi.mocked(useFileShares).mockReturnValue({
    data: { ...access, ...overrides },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useFileShares>)
  vi.mocked(useCurrentMember).mockReturnValue({
    data: { id: 'owner-1', name: 'river', email: 'river@modudrive.com' },
  } as ReturnType<typeof useCurrentMember>)
  vi.mocked(useUpdateFileScope).mockReturnValue({
    mutateAsync: scopeMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateFileScope>)
  vi.mocked(useUpdateFileShareRole).mockReturnValue({
    mutateAsync: updateRoleMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateFileShareRole>)
  vi.mocked(useRevokeFileShare).mockReturnValue({
    mutateAsync: revokeMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useRevokeFileShare>)
  vi.mocked(useShareFile).mockReturnValue({
    mutateAsync: createShareMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useShareFile>)
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
    updateRoleMutate.mockReset().mockResolvedValue(undefined)
    createShareMutate.mockReset().mockResolvedValue(undefined)
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

  it('builds the anonymous link as /public/:fileId, no key needed', async () => {
    renderModal({ scope: 'LINK', role: 'VIEWER', linkToken: 'tok-1' })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '링크 복사' }))

    expect(await navigator.clipboard.readText()).toBe('http://localhost:3000/public/file-1')
  })

  it('shows LINK as the effective scope when a parent folder link is inherited', () => {
    renderModal({
      inheritedLinks: [{ fileId: 'folder-1', name: '새 폴더', role: 'VIEWER', linkToken: 'tok-1' }],
    })

    expect(screen.getByRole('combobox')).toHaveValue('LINK')
  })

  it('builds an inherited-link file\'s public link from its own fileId, not the ancestor\'s', async () => {
    renderModal({
      inheritedLinks: [{ fileId: 'folder-1', name: '새 폴더', role: 'VIEWER', linkToken: 'tok-1' }],
    })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '링크 복사' }))

    expect(await navigator.clipboard.readText()).toBe('http://localhost:3000/public/file-1')
  })

  it('restricting an inherited-link file turns the parent folder link off instead', async () => {
    renderModal({
      inheritedLinks: [{ fileId: 'folder-1', name: '새 폴더', role: 'VIEWER', linkToken: 'tok-1' }],
    })
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

  describe('when a member has *two* independent grants on ancestors above this file', () => {
    // b (folder-1, root-most/topmost) and a (folder-2, nearer to the file) each separately
    // shared the same person, on top of this file's own direct share — three independent
    // grants for one person, matching the b > a > file nesting from the design doc's example.
    const sharesWithTwoAncestors: FileAccessList['shares'] = [
      {
        shareId: 'share-file',
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
        inheritedFrom: { fileId: 'folder-1', name: 'b' },
      },
      {
        shareId: 'share-a',
        fileId: 'folder-2',
        ownerId: 'owner-1',
        sharedWithUserId: 'grantee-1',
        role: 'VIEWER',
        sharedWithEmail: 'grantee@modudrive.com',
        sharedWithName: null,
        inheritedFrom: { fileId: 'folder-2', name: 'a' },
      },
    ]

    it('cascades to every ancestor grant, not just one — but only names the topmost in the dialog', async () => {
      renderModal({ shares: sharesWithTwoAncestors })
      const user = userEvent.setup()

      await user.selectOptions(screen.getAllByRole('combobox')[1], '삭제')

      // Only the topmost ancestor (b) is named — the nearer one (a) folds into the "···"
      // connector, matching Drive's own dialog. Both still get revoked below regardless.
      expect(screen.getByText('b')).toBeInTheDocument()
      expect(screen.queryByText('a')).not.toBeInTheDocument()
      // The "···" only appears because there IS something folded into it here (a) — see the
      // single-ancestor case below, where it must not show at all.
      expect(screen.getByText('•••')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '상위 항목에서 삭제' }))
      await user.click(screen.getByRole('button', { name: '완료' }))

      expect(revokeMutate).toHaveBeenCalledWith({ fileId: 'file-1', shareId: 'share-file' })
      expect(revokeMutate).toHaveBeenCalledWith({ fileId: 'folder-1', shareId: 'share-b' })
      expect(revokeMutate).toHaveBeenCalledWith({ fileId: 'folder-2', shareId: 'share-a' })
      expect(revokeMutate).toHaveBeenCalledTimes(3)
    })
  })

  describe('when a member has only an inherited grant on this file (no direct row of its own)', () => {
    const pureInheritedShare: FileAccessList['shares'] = [
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

    it('deletes only the ancestor grant on 완료, not a bogus one on this file', async () => {
      renderModal({ shares: pureInheritedShare })
      const user = userEvent.setup()

      await user.selectOptions(screen.getAllByRole('combobox')[1], '삭제')
      expect(screen.getByText('상위 폴더에서 삭제하시겠습니까?')).toBeInTheDocument()
      // Exactly one ancestor here — nothing is folded into an ellipsis, so none should show.
      expect(screen.queryByText('•••')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '상위 항목에서 삭제' }))
      // The row's own select must reflect the staged removal right away — pendingRoleChanges is
      // keyed by this row's own shareId regardless of it being a pure-inherited row, not a
      // genuine direct one (a prior bug skipped staging it for this case, leaving the select
      // showing the old role even though the cascade delete was correctly queued).
      expect(screen.getAllByRole('combobox')[1]).toHaveValue('REMOVE_ACCESS')

      await user.click(screen.getByRole('button', { name: '완료' }))

      expect(revokeMutate).toHaveBeenCalledWith({ fileId: 'folder-1', shareId: 'share-b' })
      expect(revokeMutate).toHaveBeenCalledTimes(1)
    })

    it('leaves everything unchanged when the confirm dialog is cancelled', async () => {
      renderModal({ shares: pureInheritedShare })
      const user = userEvent.setup()

      await user.selectOptions(screen.getAllByRole('combobox')[1], '삭제')
      await user.click(screen.getByRole('button', { name: '취소' }))

      // Reverts to the original inherited role, same as a direct row's select would.
      expect(screen.getAllByRole('combobox')[1]).toHaveValue('VIEWER')

      await user.click(screen.getByRole('button', { name: '완료' }))
      expect(revokeMutate).not.toHaveBeenCalled()
    })

    it('picking a role creates a new grant on this file instead of PATCHing the ancestor share', async () => {
      renderModal({ shares: pureInheritedShare })
      const user = userEvent.setup()

      await user.selectOptions(screen.getAllByRole('combobox')[1], '편집자')
      await user.click(screen.getByRole('button', { name: '완료' }))

      expect(createShareMutate).toHaveBeenCalledWith({
        fileId: 'file-1',
        email: 'grantee@modudrive.com',
        role: 'EDITOR',
      })
      expect(updateRoleMutate).not.toHaveBeenCalled()
    })
  })
})
