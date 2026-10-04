import type { FileCategory, PreviewKind, SortDir, SortField } from '@/types/file'

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
  DOCUMENT: new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'hwp']),
  AUDIO: new Set(['mp3', 'wav', 'flac', 'aac', 'm4a']),
}

export function categorizeFile(name: string): FileCategory {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext) return 'OTHER'
  const known = Object.keys(CATEGORY_EXTENSIONS) as Exclude<FileCategory, 'OTHER'>[]
  return known.find((c) => CATEGORY_EXTENSIONS[c].has(ext)) ?? 'OTHER'
}

/** Which inline preview (if any) a file can render as — the only kinds a browser can show via
 * plain text/<img>/<audio>/<video>. Everything else (other DOCUMENT extensions, OTHER) has no
 * preview and falls back to a download-only detail view. */
export function previewKind(name: string): PreviewKind | null {
  const ext = name.split('.').pop()?.toLowerCase()
  // md renders as plain text in a <pre>, never as HTML. Content is attacker-controlled and
  // reachable anonymously via public share links, so a future markdown-to-HTML renderer must
  // sanitize (e.g. DOMPurify) — same reason svg stays download-only below.
  if (ext === 'txt' || ext === 'md') return 'text'
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

/** The subset of fields sortFiles actually reads — narrow enough that PublicFile (the anonymous
 * link browser's row type, with no sharedBy*) satisfies it as-is via its optional fields. */
type SortableEntry = {
  directory: boolean
  name: string
  fileSize: number | null
  updatedAt?: string | null
  sharedByName?: string | null
  sharedByEmail?: string | null
}

/** Folders always sort above files. Within each group, entries order by `field`/`dir`. */
export function sortFiles<T extends SortableEntry>(
  files: T[],
  field: SortField,
  dir: SortDir,
  // Which timestamp "date" sorts by — defaults to updatedAt, but 즐겨찾기/최근 문서함 sort by
  // whatever they display instead (favoritedAt/accessedAt) so the header stays honest.
  dateValue: (file: T) => string | null | undefined = (file) => file.updatedAt,
) {
  const sign = dir === 'asc' ? 1 : -1
  return [...files].sort((a, b) => {
    if (a.directory !== b.directory) return a.directory ? -1 : 1
    if (field === 'name') return sign * a.name.localeCompare(b.name, 'ko')
    if (field === 'size') return sign * ((a.fileSize ?? 0) - (b.fileSize ?? 0))
    if (field === 'sharedBy') {
      const label = (f: T) => f.sharedByName ?? f.sharedByEmail ?? ''
      return sign * label(a).localeCompare(label(b), 'ko')
    }
    return sign * (new Date(dateValue(a) ?? 0).getTime() - new Date(dateValue(b) ?? 0).getTime())
  })
}

/** Label for a file's parent folder: root shows as "내 드라이브", otherwise its folder name. */
export function locationLabel(path: string) {
  if (path === '/') return '내 드라이브'
  return path.split('/').filter(Boolean).pop() ?? '내 드라이브'
}
