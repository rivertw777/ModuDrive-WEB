import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileShare, Permission } from '../types'

export type ShareFileInput = {
  fileId: string
  sharedWithUserId: string
  permission: Permission
}

export const shareFile = ({ fileId, ...body }: ShareFileInput) =>
  apiClient.post<FileShare>(`/api/v1/files/${fileId}/share`, body)

export function useShareFile() {
  return useMutation({
    mutationFn: shareFile,
  })
}
