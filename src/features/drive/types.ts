export type FileStatus = 'PENDING' | 'UPLOADED' | 'DELETED'
export type Permission = 'READ' | 'WRITE'
export type FileCategory = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO'

/** Sidebar entries for browsing files by category. `slug` is the URL segment under /category. */
export const FILE_CATEGORIES: { slug: string; type: FileCategory; label: string }[] = [
  { slug: 'image', type: 'IMAGE', label: '사진' },
  { slug: 'video', type: 'VIDEO', label: '동영상' },
  { slug: 'document', type: 'DOCUMENT', label: '문서' },
  { slug: 'audio', type: 'AUDIO', label: '음악' },
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
  updatedAt: string | null
}

export type FileVersion = {
  versionId: string
  fileId: string
  fileSize: number
  blockCount: number
  s3Path: string
}

export type FileShare = {
  shareId: string
  fileId: string
  ownerId: string
  sharedWithUserId: string
  permission: Permission
}

export function joinPath(path: string, name: string) {
  return path === '/' ? `/${name}` : `${path}/${name}`
}

export function formatFileSize(bytes: number | null) {
  if (bytes === null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'])

export function isImageFile(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext ? IMAGE_EXTENSIONS.has(ext) : false
}

// Mirrors backend FileCategory.java's extension sets.
const CATEGORY_EXTENSIONS: Record<FileCategory, Set<string>> = {
  IMAGE: IMAGE_EXTENSIONS,
  VIDEO: new Set(['mp4', 'mov', 'avi', 'mkv', 'webm']),
  DOCUMENT: new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'hwp']),
  AUDIO: new Set(['mp3', 'wav', 'flac', 'aac', 'm4a']),
}

export function categorizeFile(name: string): FileCategory | null {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext) return null
  return (Object.keys(CATEGORY_EXTENSIONS) as FileCategory[]).find((c) => CATEGORY_EXTENSIONS[c].has(ext)) ?? null
}

export type SortDirection = 'asc' | 'desc' | null

/** Folders always sort above files. Within each group, `direction` orders by name; null keeps original order. */
export function sortEntries(files: FileEntry[], direction: SortDirection) {
  return [...files].sort((a, b) => {
    if (a.directory !== b.directory) return a.directory ? -1 : 1
    if (!direction) return 0
    const cmp = a.name.localeCompare(b.name, 'ko')
    return direction === 'asc' ? cmp : -cmp
  })
}
