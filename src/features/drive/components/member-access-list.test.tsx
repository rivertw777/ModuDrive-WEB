import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { MemberAccessList } from './member-access-list'
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
  },
]

function renderList(sharesToRender: FileShare[] = shares) {
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemberAccessList fileId="file-1" ownerId="owner-1" shares={sharesToRender} />
    </QueryClientProvider>,
  )
}

describe('MemberAccessList', () => {
  it('renders the owner row without role/remove controls, and share rows with both', () => {
    renderList()

    expect(screen.getByText('owner-1 (소유자)')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '공유 제거' })).toBeInTheDocument()
  })

  it('shows the accessor email/name when the share is enriched', () => {
    renderList()

    expect(screen.getByText('river@modudrive.com')).toBeInTheDocument()
    expect(screen.getByText('(river)')).toBeInTheDocument()
  })

  it('falls back to a shortened id when the share has no enrichment', () => {
    renderList([{ ...shares[0], sharedWithEmail: null, sharedWithName: null }])

    expect(screen.getByText('member-1'.slice(0, 8))).toBeInTheDocument()
  })
})
