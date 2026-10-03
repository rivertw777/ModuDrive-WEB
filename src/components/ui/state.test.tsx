import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorState } from './state'

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
})
