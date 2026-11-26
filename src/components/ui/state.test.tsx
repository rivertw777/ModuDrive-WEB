import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorState } from './state'

// Daytime in KST unless a test says otherwise, so the night-stop notice stays out of the way.
beforeEach(() => vi.useFakeTimers({ now: new Date('2026-11-26T03:00:00Z'), toFake: ['Date'] }))
afterEach(() => vi.useRealTimers())

describe('ErrorState', () => {
  it("says access is denied for a 403 instead of the screen's own message", () => {
    render(<ErrorState message="파일 정보를 불러오지 못했습니다" error={{ status: 403 }} />)

    expect(screen.getByText('접근 권한이 없습니다')).toBeInTheDocument()
    expect(screen.queryByText('파일 정보를 불러오지 못했습니다')).not.toBeInTheDocument()
  })

  it("keeps the screen's own message for any other failure", () => {
    render(<ErrorState message="파일 정보를 불러오지 못했습니다" error={{ status: 503 }} />)

    expect(screen.getByText('파일 정보를 불러오지 못했습니다')).toBeInTheDocument()
  })

  it('shows the service hours instead for a server failure during the night stop', () => {
    vi.setSystemTime(new Date('2026-11-25T17:00:00Z')) // 02:00 KST
    render(<ErrorState message="휴지통을 불러오지 못했습니다" error={new Error('Network Error')} />)

    expect(screen.getByText('서비스 이용 시간 안내')).toBeInTheDocument()
    expect(screen.queryByText('휴지통을 불러오지 못했습니다')).not.toBeInTheDocument()
  })
})
