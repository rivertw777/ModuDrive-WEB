import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UploadStatusPanel } from './upload-status-panel'
import type { UploadItem } from '../hooks/use-file-upload'

const row = (overrides: Partial<UploadItem>): UploadItem => ({
  id: '0',
  name: 'a.txt',
  directory: false,
  totalBytes: 100,
  hashedBytes: 100,
  sentBytes: 0,
  fileCount: 1,
  doneCount: 0,
  errorCount: 0,
  status: 'uploading',
  ...overrides,
})

describe('UploadStatusPanel', () => {
  it('shows a folder as one row with its file count and byte progress', () => {
    render(
      <UploadStatusPanel
        uploads={[row({ name: '사진', directory: true, fileCount: 40, doneCount: 12, sentBytes: 25 })]}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText('사진')).toBeInTheDocument()
    expect(screen.getByText('12/40개 파일')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('항목 1개 업로드 중')).toBeInTheDocument()
  })

  it('counts a partly failed folder as failed and says how many files failed', () => {
    render(
      <UploadStatusPanel
        uploads={[
          row({ id: '0', name: '사진', directory: true, fileCount: 3, doneCount: 2, errorCount: 1, status: 'error' }),
          row({ id: '1', name: 'b.txt', status: 'done' }),
        ]}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText('2/3개 파일', { exact: false })).toHaveTextContent('2/3개 파일 · 1개 실패')
    expect(screen.getByText('1개 완료, 1개 실패')).toBeInTheDocument()
  })

  it('shows how far hashing got before the first byte is sent', () => {
    render(<UploadStatusPanel uploads={[row({ hashedBytes: 37 })]} onDismiss={vi.fn()} />)

    expect(screen.getByText('준비 중 37%')).toBeInTheDocument()
  })

  it('shows a paused row as waiting, still counted as uploading', () => {
    render(<UploadStatusPanel uploads={[row({ sentBytes: 40, status: 'paused' })]} onDismiss={vi.fn()} />)

    expect(screen.getByText('연결 대기 중 · 자동으로 다시 시도합니다')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('항목 1개 업로드 중')).toBeInTheDocument()
  })
})
