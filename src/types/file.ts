/** TRASHED = in the trash, recoverable via restore. DELETED = purged (tombstone) — a live listing
 * never actually returns this; it's here for type completeness. */
export type FileStatus = 'PENDING' | 'UPLOADED' | 'TRASHED' | 'DELETED'
/** Nested — EDITOR includes everything VIEWER can do. */
export type Role = 'VIEWER' | 'EDITOR'
export type FileCategory = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'OTHER'

/** Sidebar entries for browsing files by category. `slug` is the URL segment under /category. */
export const FILE_CATEGORIES: { slug: string; type: FileCategory; label: string }[] = [
  { slug: 'document', type: 'DOCUMENT', label: '문서' },
  { slug: 'image', type: 'IMAGE', label: '사진' },
  { slug: 'video', type: 'VIDEO', label: '동영상' },
  { slug: 'audio', type: 'AUDIO', label: '음악' },
  { slug: 'other', type: 'OTHER', label: '기타' },
]

export type FileEntry = {
  fileId: string
  namespaceId: string
  name: string
  path: string
  ownerId: string
  currentVersionId: string | null
  fileSize: number | null
  status: FileStatus
  directory: boolean
  favorite: boolean
  /** Server-computed from the name (mirrors backend FileCategory.of()) — meaningless for directories. */
  category: FileCategory
  updatedAt: string | null
  /** When the file was sent to trash — null unless it is in the trash. Use this, not
   * {@link updatedAt}, for the trash view's "휴지통에 버린 날짜". */
  trashedAt?: string | null
  /** Only populated by GET /api/v1/files/shared-with-me: who shared the file (null if the
   * backend could not resolve them), the caller's role on it, and when it was shared. */
  sharedByName?: string | null
  sharedByEmail?: string | null
  role?: Role
  sharedAt?: string | null
  /** Only populated by GET /api/v1/files/recent — when the caller opened it ("접근한 날짜"). */
  accessedAt?: string | null
  /** Only populated by GET /api/v1/files/favorites — when the caller starred it ("즐겨찾기한 날짜"). */
  favoritedAt?: string | null
}

// Private MIME type for in-list drags (moving files between folders) — keeps them from being
// mistaken for (or matched by) an OS file drag, and from being read by a foreign drop target.
export const DRAG_MIME = 'application/x-modudrive-file-ids'

export type PreviewKind = 'text' | 'image' | 'audio' | 'video'

export type SortField = 'name' | 'size' | 'date' | 'sharedBy'
export type SortDir = 'asc' | 'desc'
