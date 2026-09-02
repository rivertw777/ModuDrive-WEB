import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

/** Children of a directory the caller reached through a share (their own on it, or inherited
 * from a directory above it) — the entry point for browsing into a folder in "shared with me". */
export const listSharedDirectory = (fileId: string) =>
  apiClient.get<FileEntry[]>(`/api/v1/files/${encodeURIComponent(fileId)}/children`)

export function useSharedDirectory(fileId: string | null) {
  return useQuery({
    queryKey: ['shared-directory', fileId],
    queryFn: () => listSharedDirectory(fileId as string),
    enabled: fileId !== null,
  })
}
