import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api-client'
import { downloadArchive, downloadPublicArchive } from './download-archive'

const clicked: string[] = []

beforeEach(() => {
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push(this.href)
  })
})

afterEach(() => {
  clicked.length = 0
  vi.restoreAllMocks()
})

describe('downloadArchive', () => {
  it('prepares with the picked ids, then follows the single-use token link', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ token: 'tok' })

    await downloadArchive(['a', 'b'])

    expect(post).toHaveBeenCalledWith('/api/v1/storage/archive', { fileIds: ['a', 'b'] })
    expect(clicked).toEqual([expect.stringMatching(/\/api\/v1\/storage\/public\/archive\/tok$/)])
  })
})

describe('downloadPublicArchive', () => {
  it('rethrows the server message and follows no link when prepare is refused', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(
      Object.assign(new axios.AxiosError('Request failed'), {
        response: { data: { message: '한 번에 압축해 받을 수 있는 양은 …', status: '413', data: null } },
      }),
    )

    await expect(downloadPublicArchive(['a'], null)).rejects.toThrow('한 번에 압축해 받을 수 있는 양은 …')
    expect(clicked).toEqual([])
  })
})
