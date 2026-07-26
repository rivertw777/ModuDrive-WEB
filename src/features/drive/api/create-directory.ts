import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export type CreateDirectoryInput = {
  name: string
  path: string
}

export const createDirectory = (input: CreateDirectoryInput) =>
  apiClient.post<FileEntry>('/api/v1/directories', input)

export function useCreateDirectory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDirectory,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directory', variables.path] })
    },
  })
}
