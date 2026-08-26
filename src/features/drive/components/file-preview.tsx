import { useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { env } from '@/config/env'
import { canPreviewFile, previewKind, type PreviewKind } from '../types'
import { viewFile } from '../api/view-file'
import { viewPublicFile } from '../api/view-public-file'
import { issueStreamToken } from '../api/issue-stream-token'

type Source = { type: 'auth'; fileId: string } | { type: 'public'; token: string }

function isStreamed(kind: PreviewKind | null) {
  return kind === 'audio' || kind === 'video'
}

function streamUrl(
  sourceType: Source['type'],
  sourceId: string,
  fileName: string,
  streamToken?: string,
) {
  const params = new URLSearchParams({ fileName })
  if (sourceType === 'public') {
    return `${env.API_BASE_URL}/api/v1/storage/public/${encodeURIComponent(sourceId)}/view?${params}`
  }
  if (streamToken) params.set('streamToken', streamToken)
  return `${env.API_BASE_URL}/api/v1/storage/view/${encodeURIComponent(sourceId)}?${params}`
}

/** Renders an inline text/image/audio/video preview, or nothing when the file isn't a
 * previewable kind or is larger than its kind's cap (see `canPreviewFile`) — preview fires
 * automatically on open, unlike the explicit download button, so a large file must not be
 * fetched in full just because the panel was opened. Shared by PublicFileView (link visitor)
 * and FileViewerModal (double-click full-screen view) via `source` — same rendering, different
 * fetch. `fullscreen` swaps the sidebar-sized caps for viewer-sized ones.
 *
 * text/image are small enough to just blob-fetch (revoked on unmount/file change so repeated
 * opens don't leak memory). audio/video instead point straight at the Range/206-backed view
 * endpoint — the element pulls its own bytes and seeks natively; a public link's token already
 * is the credential, an authenticated view needs a short-lived stream token first (see
 * issueStreamToken) since the element can't attach an Authorization header. */
export function FilePreview({
  fileName,
  fileSize,
  source,
  fullscreen = false,
}: {
  fileName: string
  fileSize: number | null
  source: Source
  fullscreen?: boolean
}) {
  const kind = canPreviewFile(fileName, fileSize) ? previewKind(fileName) : null
  const sourceType = source.type
  const sourceId = source.type === 'auth' ? source.fileId : source.token
  const [text, setText] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!kind) return
    setError(false)
    setText(null)
    setUrl(null)

    if (isStreamed(kind)) {
      if (sourceType === 'public') {
        setUrl(streamUrl(sourceType, sourceId, fileName))
        return
      }
      let cancelled = false
      issueStreamToken(sourceId)
        .then((streamToken) => {
          if (!cancelled) setUrl(streamUrl(sourceType, sourceId, fileName, streamToken))
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
      return () => {
        cancelled = true
      }
    }

    let cancelled = false
    let objectUrl: string | null = null

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

  const maxH = fullscreen ? 'max-h-[80vh]' : 'max-h-64'

  if (kind === 'text') {
    return text === null ? (
      <LoadingState />
    ) : (
      <pre
        className={`${maxH} overflow-auto rounded-lg bg-slate-50 p-3 text-left text-xs whitespace-pre-wrap text-slate-700 dark:bg-slate-900 dark:text-slate-300`}
      >
        {text}
      </pre>
    )
  }

  if (url === null) return <LoadingState />
  // fullscreen (the viewer modal) sizes the element to the actual displayed pixels so a
  // click on the letterboxed space around it reaches the modal's backdrop-close handler —
  // w-full would keep that dead space inside the element's own box and swallow the click.
  const mediaWidth = fullscreen ? 'w-auto max-w-full' : 'w-full'
  if (kind === 'image')
    return (
      <img src={url} alt={fileName} className={`${maxH} ${mediaWidth} rounded-lg object-contain`} />
    )
  if (kind === 'audio')
    return (
      <audio
        src={url}
        controls
        className="w-full max-w-4xl rounded-lg"
        onError={() => setError(true)}
      />
    )
  return (
    <video
      src={url}
      controls
      className={`${maxH} ${mediaWidth} rounded-lg`}
      onError={() => setError(true)}
    />
  )
}
