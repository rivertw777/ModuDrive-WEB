import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry } from '../types'

export type ToggleFavoriteInput = {
  fileId: string
  favorite: boolean
}

export const toggleFavorite = ({ fileId, favorite }: ToggleFavoriteInput) =>
  apiClient.patch<FileEntry>(`/api/v1/files/${encodeURIComponent(fileId)}/favorite`, { favorite })

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleFavorite,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directory'] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      // recent / category / all + search results also render the star
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
      queryClient.invalidateQueries({ queryKey: ['file', variables.fileId] })
    },
  })
}
