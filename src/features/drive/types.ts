export type FileStatus = 'PENDING' | 'UPLOADED' | 'DELETED'
/** Nested — EDITOR includes everything VIEWER can do. */
export type Role = 'VIEWER' | 'EDITOR'
export type ShareScope = 'RESTRICTED' | 'LINK'
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
}

export type FileShare = {
  shareId: string
  fileId: string
  ownerId: string
  /** Null for a pending guest share (invited by email, not yet a member). */
  sharedWithUserId: string | null
  role: Role
  /** Populated on the shares list response; null on create/update-role responses
   * (the caller already knows who they just acted on). */
  sharedWithEmail: string | null
  sharedWithName: string | null
  /** Non-null when this grant is inherited from a directory above the listed file, not a
   * share on the file itself — shown read-only; change it from that folder's own dialog. */
  inheritedFrom: { fileId: string; name: string } | null
}

/** A directory above the listed file that is currently "anyone with the link" — the file is
 * reachable through it. To restrict the file you turn these links off (no inheritance break). */
export type InheritedLink = {
  fileId: string
  name: string
  role: Role
}

export type FileAccessList = {
  fileId: string
  ownerId: string
  scope: ShareScope
  /** Role applied to anonymous link visitors. Null when scope is RESTRICTED. */
  role: Role | null
  linkToken: string | null
  shares: FileShare[]
  inheritedLinks: InheritedLink[]
}

/** Deliberately narrow — an anonymous link visitor gets no path/owner/version info. */
export type PublicFile = {
  fileId: string
  name: string
  fileSize: number | null
  directory: boolean
  updatedAt: string | null
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

// Mirrors backend FileCategory.java's extension sets (OTHER is the catch-all, same as FileCategory.of()).
const CATEGORY_EXTENSIONS: Record<Exclude<FileCategory, 'OTHER'>, Set<string>> = {
  IMAGE: IMAGE_EXTENSIONS,
  VIDEO: new Set(['mp4', 'mov', 'avi', 'mkv', 'webm']),
  DOCUMENT: new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'hwp']),
  AUDIO: new Set(['mp3', 'wav', 'flac', 'aac', 'm4a']),
}

export function categorizeFile(name: string): FileCategory {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext) return 'OTHER'
  const known = Object.keys(CATEGORY_EXTENSIONS) as Exclude<FileCategory, 'OTHER'>[]
  return known.find((c) => CATEGORY_EXTENSIONS[c].has(ext)) ?? 'OTHER'
}

export type PreviewKind = 'text' | 'image' | 'audio' | 'video'

/** Which inline preview (if any) a file can render as — the only kinds a browser can show via
 * plain text/<img>/<audio>/<video>. Everything else (other DOCUMENT extensions, OTHER) has no
 * preview and falls back to a download-only detail view. */
export function previewKind(name: string): PreviewKind | null {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'txt') return 'text'
  // SVG can embed <script> and browsers execute it when rendered inline — no safe preview
  // without sanitization, so it stays IMAGE for categorization but download-only for preview.
  if (ext === 'svg') return null
  const category = categorizeFile(name)
  if (category === 'IMAGE') return 'image'
  if (category === 'AUDIO') return 'audio'
  if (category === 'VIDEO') return 'video'
  return null
}

/** text/image still fully blob-fetch into browser memory before rendering (see FilePreview), so
 * the cap stops a huge one from being pulled in full just because a panel was opened. audio/video
 * instead point <audio>/<video> straight at the streaming view endpoint (Range/206-backed) — the
 * element only ever pulls the bytes it plays, so there's no size cap to apply. */
const PREVIEW_MAX_BYTES: Partial<Record<PreviewKind, number>> = {
  text: 10 * 1024 * 1024,
  image: 10 * 1024 * 1024,
}

export function canPreviewFile(name: string, fileSize: number | null): boolean {
  const kind = previewKind(name)
  if (!kind) return false
  const cap = PREVIEW_MAX_BYTES[kind]
  return cap === undefined || fileSize === null || fileSize <= cap
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

/** "report.pdf" + 1 -> "report (1).pdf" — the name used to keep both copies on a name conflict. */
export function numberedName(name: string, n: number) {
  const dot = name.lastIndexOf('.')
  // dot === 0 is a dotfile (".env"), which has no extension to keep the number in front of.
  return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`
}

/** Label for a file's parent folder: root shows as "내 드라이브", otherwise its folder name. */
export function locationLabel(path: string) {
  if (path === '/') return '내 드라이브'
  return path.split('/').filter(Boolean).pop() ?? '내 드라이브'
}
