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

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'])

export function isImageFile(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext ? IMAGE_EXTENSIONS.has(ext) : false
}
