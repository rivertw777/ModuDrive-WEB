export type FileStatus = 'PENDING' | 'UPLOADED' | 'DELETED'
export type Permission = 'READ' | 'WRITE'

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
