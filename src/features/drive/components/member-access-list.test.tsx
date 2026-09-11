import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemberAccessList, REMOVE_ACCESS, type PendingChange } from './member-access-list'
import type { FileShare } from '../types'

const shares: FileShare[] = [
  {
    shareId: 'share-1',
    fileId: 'file-1',
    ownerId: 'owner-1',
    sharedWithUserId: 'member-1',
    role: 'VIEWER',
    sharedWithEmail: 'river@modudrive.com',
    sharedWithName: 'river',
    inheritedFrom: null,
  },
]

function renderList({
  sharesToRender = shares,
  isOwner = true,
  directory = false,
  pendingChanges = {},
  onChange = vi.fn(),
}: {
  sharesToRender?: FileShare[]
  isOwner?: boolean
  directory?: boolean
  pendingChanges?: Record<string, PendingChange>
  onChange?: (shareId: string, change: PendingChange) => void
} = {}) {
  render(
    <MemberAccessList
      ownerId="owner-1"
      shares={sharesToRender}
      isOwner={isOwner}
      directory={directory}
      pendingChanges={pendingChanges}
      onChange={onChange}
    />,
  )
  return { onChange }
}

describe('MemberAccessList', () => {
  it('renders the owner row without a role control, and a role/remove select for share rows', () => {
    renderList()

    expect(screen.getByText('owner-1')).toBeInTheDocument()
    expect(screen.getByText('소유자')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
    expect(screen.getByRole('option', { name: '삭제' })).toBeInTheDocument()
  })

  it('shows the accessor email/name when the share is enriched', () => {
    renderList()

    expect(screen.getByText('river@modudrive.com')).toBeInTheDocument()
    expect(screen.getByText('river')).toBeInTheDocument()
  })

  it('falls back to a shortened id when the share has no enrichment', () => {
    renderList({ sharesToRender: [{ ...shares[0], sharedWithEmail: null, sharedWithName: null }] })

    expect(screen.getByText('member-1'.slice(0, 8))).toBeInTheDocument()
  })

  it('labels a pending guest share instead of crashing on a null accessor id', () => {
    renderList({ sharesToRender: [{ ...shares[0], sharedWithUserId: null, sharedWithName: null }] })

    expect(screen.getByText('초대됨')).toBeInTheDocument()
    expect(screen.getByText('river@modudrive.com')).toBeInTheDocument()
  })

  it('stages a role pick on a guest DIRECT share via onChange with no confirmation — it already has a no-login link', async () => {
    const { onChange } = renderList({
      sharesToRender: [{ ...shares[0], sharedWithUserId: null, sharedWithName: null }],
    })
    const user = userEvent.setup()

    await user.selectOptions(screen.getByRole('combobox'), '편집자')

    expect(onChange).toHaveBeenCalledWith('share-1', 'EDITOR')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('hides the role/remove select and shows a read-only role label for non-owners', () => {
    renderList({ isOwner: false })

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText('뷰어')).toBeInTheDocument()
  })

  it('reports a staged change via onChange instead of calling an API directly', async () => {
    const { onChange } = renderList()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByRole('combobox'), '삭제')

    expect(onChange).toHaveBeenCalledWith('share-1', REMOVE_ACCESS)
  })

  it('shows a pending removal as struck-through and selected on 삭제', () => {
    renderList({ pendingChanges: { 'share-1': REMOVE_ACCESS } })

    expect(screen.getByText('river')).toHaveClass('line-through')
    expect(screen.getByRole('combobox')).toHaveValue(REMOVE_ACCESS)
  })

  describe('a pure-inherited row (no direct grant of its own on this file)', () => {
    const inheritedShare: FileShare = {
      ...shares[0],
      inheritedFrom: { fileId: 'folder-1', name: '폴더 A' },
    }

    it('shows the same role/remove select a direct row gets', () => {
      renderList({ sharesToRender: [inheritedShare] })

      expect(screen.getByRole('combobox')).toHaveValue('VIEWER')
      expect(screen.getByRole('option', { name: '삭제' })).toBeInTheDocument()
    })

    it('stages a removal via onChange, keyed by the row (the ancestor grant)', async () => {
      const { onChange } = renderList({ sharesToRender: [inheritedShare] })
      const user = userEvent.setup()

      await user.selectOptions(screen.getByRole('combobox'), '삭제')

      expect(onChange).toHaveBeenCalledWith('share-1', REMOVE_ACCESS)
    })

    it('stages a role pick via onChange too — ShareModal turns this into a new grant on this file', async () => {
      const { onChange } = renderList({ sharesToRender: [inheritedShare] })
      const user = userEvent.setup()

      await user.selectOptions(screen.getByRole('combobox'), '편집자')

      expect(onChange).toHaveBeenCalledWith('share-1', 'EDITOR')
    })

    it('hides the select for non-owners', () => {
      renderList({ sharesToRender: [inheritedShare], isOwner: false })

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(screen.getByText('뷰어')).toBeInTheDocument()
    })
  })

  describe("a guest's (no member account) inherited row", () => {
    const guestInheritedShare: FileShare = {
      ...shares[0],
      sharedWithUserId: null,
      sharedWithName: null,
      sharedWithEmail: 'guest@example.com',
      inheritedFrom: { fileId: 'folder-1', name: '폴더 A' },
    }

    it('shows the same role/remove select a member inherited row gets, not a read-only label', () => {
      renderList({ sharesToRender: [guestInheritedShare] })

      expect(screen.getByRole('combobox')).toHaveValue('VIEWER')
      expect(screen.getByRole('option', { name: '삭제' })).toBeInTheDocument()
    })

    it('stages a removal via onChange directly, no confirmation needed', async () => {
      const { onChange } = renderList({ sharesToRender: [guestInheritedShare] })
      const user = userEvent.setup()

      await user.selectOptions(screen.getByRole('combobox'), '삭제')

      expect(onChange).toHaveBeenCalledWith('share-1', REMOVE_ACCESS)
    })

    it('asks for no-login-access confirmation before staging a role pick', async () => {
      const { onChange } = renderList({ sharesToRender: [guestInheritedShare] })
      const user = userEvent.setup()

      await user.selectOptions(screen.getByRole('combobox'), '편집자')

      expect(onChange).not.toHaveBeenCalled()
      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByText('ModuDrive 이외의 계정과 공유하시겠습니까?')).toBeInTheDocument()
      expect(dialog.getByText(/guest@example.com/)).toBeInTheDocument()
      expect(dialog.getByText(/이 파일에 대한 개별 공유/)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '무시하고 공유' }))

      expect(onChange).toHaveBeenCalledWith('share-1', 'EDITOR')
    })

    it('words the confirmation as 폴더 when this row belongs to a directory', async () => {
      renderList({ sharesToRender: [guestInheritedShare], directory: true })
      const user = userEvent.setup()

      await user.selectOptions(screen.getByRole('combobox'), '편집자')

      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByText(/이 폴더에 대한 개별 공유/)).toBeInTheDocument()
    })

    it('stages nothing when the confirmation is cancelled', async () => {
      const { onChange } = renderList({ sharesToRender: [guestInheritedShare] })
      const user = userEvent.setup()

      await user.selectOptions(screen.getByRole('combobox'), '편집자')
      await user.click(screen.getByRole('button', { name: '취소' }))

      expect(onChange).not.toHaveBeenCalled()
      expect(
        screen.queryByText('ModuDrive 이외의 계정과 공유하시겠습니까?'),
      ).not.toBeInTheDocument()
      // Nothing staged, so the controlled select reverts to the row's actual role — it must not
      // keep showing 편집자 as if the pick had gone through.
      expect(screen.getByRole('combobox')).toHaveValue('VIEWER')
    })

    it('hides the select for non-owners', () => {
      renderList({ sharesToRender: [guestInheritedShare], isOwner: false })

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(screen.getByText('뷰어')).toBeInTheDocument()
    })
  })

  describe('the same member inherited from two independent ancestors', () => {
    // Server lists ancestors root-most first and never collapses them (see ListFileSharesService)
    // — the far ancestor grants EDITOR, the near one VIEWER. For a grantee with no direct share,
    // FileAccessGuard.resolveRole resolves to the nearest ancestor's role regardless of which is
    // more generous, so only that row should render.
    const farAncestorGrant: FileShare = {
      ...shares[0],
      shareId: 'share-far',
      role: 'EDITOR',
      inheritedFrom: { fileId: 'folder-far', name: '먼 폴더' },
    }
    const nearAncestorGrant: FileShare = {
      ...shares[0],
      shareId: 'share-near',
      role: 'VIEWER',
      inheritedFrom: { fileId: 'folder-near', name: '가까운 폴더' },
    }

    it('shows only the nearest ancestor (listed last), even when a farther one is more generous', () => {
      renderList({ sharesToRender: [farAncestorGrant, nearAncestorGrant] })

      expect(screen.getAllByRole('combobox')).toHaveLength(1)
      expect(screen.getByRole('combobox')).toHaveValue('VIEWER')
      expect(screen.getByText('가까운 폴더에서 상속됨')).toBeInTheDocument()
    })
  })

  describe('a guest (sharedWithUserId is always null) inherited from two ancestors', () => {
    const farGuestGrant: FileShare = {
      ...shares[0],
      shareId: 'share-guest-far',
      sharedWithUserId: null,
      sharedWithName: null,
      sharedWithEmail: 'guest@example.com',
      role: 'EDITOR',
      inheritedFrom: { fileId: 'folder-far', name: '먼 폴더' },
    }
    const nearGuestGrant: FileShare = {
      ...farGuestGrant,
      shareId: 'share-guest-near',
      role: 'VIEWER',
      inheritedFrom: { fileId: 'folder-near', name: '가까운 폴더' },
    }

    it('collapses the same guest email to the nearest ancestor, not one row per ancestor', () => {
      renderList({ sharesToRender: [farGuestGrant, nearGuestGrant] })

      expect(screen.getAllByText('guest@example.com')).toHaveLength(1)
      expect(screen.getByText('가까운 폴더에서 상속됨')).toBeInTheDocument()
      expect(screen.queryByText('먼 폴더에서 상속됨')).not.toBeInTheDocument()
    })

    it('keeps two different guest emails from two ancestors as separate rows', () => {
      const otherGuestGrant: FileShare = { ...farGuestGrant, sharedWithEmail: 'other@example.com' }
      renderList({ sharesToRender: [otherGuestGrant, nearGuestGrant] })

      expect(screen.getByText('other@example.com')).toBeInTheDocument()
      expect(screen.getByText('guest@example.com')).toBeInTheDocument()
    })

    it('hides the inherited row once the same guest email also has a direct share on this file', () => {
      const directGuestShare: FileShare = {
        ...farGuestGrant,
        shareId: 'share-guest-direct',
        inheritedFrom: null,
      }
      renderList({ sharesToRender: [directGuestShare, nearGuestGrant] })

      expect(screen.getAllByText('guest@example.com')).toHaveLength(1)
      expect(screen.queryByText('가까운 폴더에서 상속됨')).not.toBeInTheDocument()
    })
  })
})
