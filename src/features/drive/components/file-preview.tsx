import { useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { previewKind } from '../types'
import { viewFile } from '../api/view-file'
import { viewPublicFile } from '../api/view-public-file'

type Source = { type: 'auth'; fileId: string } | { type: 'public'; token: string }

// ponytail: flat cap across all preview kinds (video included); per-kind caps if that UX suffers
const PREVIEW_MAX_BYTES = 10 * 1024 * 1024

/** Renders an inline text/image/audio/video preview, or nothing when the file isn't a
 * previewable kind (see `previewKind`) or is larger than PREVIEW_MAX_BYTES — preview fires
 * automatically on open, unlike the explicit download button, so a large file must not be
 * fetched in full just because the panel was opened. Shared by FileDetailPanel (auth) and
 * PublicFileView (link visitor) via `source` — same rendering, different fetch. Fetches the
 * blob once per file and revokes its object URL on unmount/file change so repeated opens don't
 * leak memory. */
export function FilePreview({
  fileName,
  fileSize,
  source,
}: {
  fileName: string
  fileSize: number | null
  source: Source
}) {
  const kind = fileSize !== null && fileSize > PREVIEW_MAX_BYTES ? null : previewKind(fileName)
  const sourceType = source.type
  const sourceId = source.type === 'auth' ? source.fileId : source.token
  const [text, setText] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!kind) return
    let cancelled = false
    let objectUrl: string | null = null
    setError(false)
    setText(null)
    setUrl(null)

    ;(sourceType === 'auth' ? viewFile(sourceId, fileName) : viewPublicFile(sourceId, fileName))
      .then(async (blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl)
          return
        }
        objectUrl = blobUrl
        if (kind === 'text') {
          const content = await (await fetch(blobUrl)).text()
          if (!cancelled) setText(content)
        } else {
          setUrl(blobUrl)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [kind, fileName, sourceType, sourceId])

  if (!kind) return null
  if (error) return <ErrorState message="미리보기를 불러오지 못했습니다" />

  if (kind === 'text') {
    return text === null ? (
      <LoadingState />
    ) : (
      <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-left text-xs whitespace-pre-wrap text-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {text}
      </pre>
    )
  }

  if (url === null) return <LoadingState />
  if (kind === 'image')
    return <img src={url} alt={fileName} className="max-h-64 w-full rounded-lg object-contain" />
  if (kind === 'audio') return <audio src={url} controls className="w-full" />
  return <video src={url} controls className="max-h-64 w-full rounded-lg" />
}
