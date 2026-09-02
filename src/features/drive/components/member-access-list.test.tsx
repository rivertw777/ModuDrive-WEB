import { render, screen } from '@testing-library/react'
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
  pendingChanges = {},
  onChange = vi.fn(),
}: {
  sharesToRender?: FileShare[]
  isOwner?: boolean
  pendingChanges?: Record<string, PendingChange>
  onChange?: (shareId: string, change: PendingChange) => void
} = {}) {
  render(
    <MemberAccessList
      ownerId="owner-1"
      shares={sharesToRender}
      isOwner={isOwner}
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
})
