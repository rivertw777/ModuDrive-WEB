import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { MemberAccessList } from './member-access-list'
import type { FileShare } from '../types'

const shares: FileShare[] = [
  { shareId: 'share-1', fileId: 'file-1', ownerId: 'owner-1', sharedWithUserId: 'member-1', role: 'VIEWER' },
]

function renderList() {
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemberAccessList fileId="file-1" ownerId="owner-1" shares={shares} />
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
})
