import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { FileEntry, SortDir, SortField } from '../types'

/** One keyset page from `GET /api/v1/directories`. `nextCursor` is opaque — pass it straight
 * back as the `cursor` param for the following page. */
export type DirectoryPage = {
  content: FileEntry[]
  nextCursor: string | null
  hasNext: boolean
}

const PAGE_SIZE = 100
/** move-dialog needs every subfolder at once, not a page — fetch up to the server's cap. */
const ALL_FOLDERS_SIZE = 200

export const listDirectoryPage = (
  path: string,
  opts: { sort: SortField; direction: SortDir; cursor?: string | null; size?: number },
) =>
  apiClient.get<DirectoryPage>('/api/v1/directories', {
    params: {
      path,
      sort: opts.sort,
      direction: opts.direction,
      size: opts.size ?? PAGE_SIZE,
      ...(opts.cursor ? { cursor: opts.cursor } : {}),
    },
  })

export function useDirectoryListing(path: string, sort: SortField, direction: SortDir) {
  return useInfiniteQuery({
    queryKey: ['directory', path, sort, direction],
    queryFn: ({ pageParam }) => listDirectoryPage(path, { sort, direction, cursor: pageParam }),
    initialPageParam: null as string | null,
    // Stop on a cursor that doesn't advance — a buggy server returning hasNext:true with the
    // same cursor would otherwise refetch the same page forever while the sentinel is visible.
    getNextPageParam: (last, _pages, lastParam) =>
      last.hasNext && last.nextCursor && last.nextCursor !== lastParam ? last.nextCursor : undefined,
  })
}

/**
 * Every subfolder at `path` (not paginated) — move-dialog filters the full set to build its
 * destination tree. Shares the `['directory', path, ...]` key prefix so the same mutations that
 * refresh the listing (new folder, rename, delete) refresh this too.
 * ponytail: one fixed 200-row fetch; revisit only if a folder really holds hundreds of subfolders.
 */
export function useDirectoryFolders(path: string) {
  return useQuery({
    queryKey: ['directory', path, 'folders'],
    queryFn: () => listDirectoryPage(path, { sort: 'name', direction: 'asc', size: ALL_FOLDERS_SIZE }),
    select: (page) => page.content.filter((entry) => entry.directory),
  })
}
