import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export const getFile = (fileId: string) =>
  apiClient.get<FileEntry>(`/api/v1/files/${encodeURIComponent(fileId)}`)

export function useFile(fileId: string | null) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['file', fileId],
    queryFn: () => getFile(fileId as string),
    enabled: fileId !== null,
  })

  // GET /files/:id records a "recent files" access server-side (Google-Drive-style: opening
  // the detail panel counts as opening the file). Refresh the recent list so it reflects that
  // without needing a manual reload.
  useEffect(() => {
    if (query.isSuccess) void queryClient.invalidateQueries({ queryKey: ['files', 'recent'] })
  }, [query.isSuccess, query.dataUpdatedAt, fileId, queryClient])

  return query
}
