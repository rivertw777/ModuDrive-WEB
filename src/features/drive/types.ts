export type FileStatus = 'PENDING' | 'UPLOADED' | 'DELETED'
export type Permission = 'READ' | 'WRITE'
export type FileCategory = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO'

/** Sidebar entries for browsing files by category. `slug` is the URL segment under /category. */
export const FILE_CATEGORIES: { slug: string; type: FileCategory; label: string }[] = [
  { slug: 'document', type: 'DOCUMENT', label: '문서' },
  { slug: 'image', type: 'IMAGE', label: '사진' },
  { slug: 'video', type: 'VIDEO', label: '동영상' },
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

export type SortField = 'name' | 'size' | 'date'
export type SortDir = 'asc' | 'desc'

/** Folders always sort above files. Within each group, entries order by `field`/`dir`. */
export function sortFiles(files: FileEntry[], field: SortField, dir: SortDir) {
  const sign = dir === 'asc' ? 1 : -1
  return [...files].sort((a, b) => {
    if (a.directory !== b.directory) return a.directory ? -1 : 1
    if (field === 'name') return sign * a.name.localeCompare(b.name, 'ko')
    if (field === 'size') return sign * ((a.fileSize ?? 0) - (b.fileSize ?? 0))
    return sign * (new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime())
  })
}

/** Label for a file's parent folder: root shows as "내 드라이브", otherwise its folder name. */
export function locationLabel(path: string) {
  if (path === '/') return '내 드라이브'
  return path.split('/').filter(Boolean).pop() ?? '내 드라이브'
}
