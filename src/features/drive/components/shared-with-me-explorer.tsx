import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { ChevronRightIcon, UsersIcon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
import { getFile } from '../api/get-file'
import { listSharedWithMe, useSharedWithMe } from '../api/list-shared-with-me'
import { listSharedDirectory, useSharedDirectory } from '../api/list-shared-directory'
import { useFileDeeplink } from '../hooks/use-file-deeplink'
import { joinPath, type FileEntry } from '../types'
import { FileList } from './file-list'
import { FileDetailPanel } from './file-detail-panel'
import { ViewToggle } from './view-toggle'

type Crumb = { fileId: string; name: string }

/** A `?file=` deep link only names a fileId — it says nothing about which folder it lives in.
 * Root-level shared items render straight away, but a file the caller only reaches through an
 * ancestor's grant (a nested file inside a shared folder) needs its trail built first, so this
 * walks from the shared root down to it by name, matching how {@link FileEntry.path} nests
 * relative to whichever root item's own path it falls under. Also builds one-shot rather than
 * per-render — the shared list and each directory level are fetched at most once here regardless
 * of how many times the resolving effect re-runs while data streams in. */
async function resolveSharedTrail(
  queryClient: ReturnType<typeof useQueryClient>,
  targetFileId: string,
): Promise<Crumb[] | null> {
  const root = await queryClient.fetchQuery({
    queryKey: ['shared-with-me'],
    queryFn: listSharedWithMe,
  })
  if (root.some((f) => f.fileId === targetFileId)) return [] // already at the root, no trail needed

  const target = await queryClient.fetchQuery({
    queryKey: ['file', targetFileId],
    queryFn: () => getFile(targetFileId),
  })

  const rootMatch = root
    .filter((f) => f.directory)
    .find((f) => {
      const fullPath = joinPath(f.path, f.name)
      return target.path === fullPath || target.path.startsWith(`${fullPath}/`)
    })
  if (!rootMatch) return null

  const trail: Crumb[] = [{ fileId: rootMatch.fileId, name: rootMatch.name }]
  const rootFullPath = joinPath(rootMatch.path, rootMatch.name)
  const remaining = target.path.slice(rootFullPath.length).split('/').filter(Boolean)

  let pool = await queryClient.fetchQuery({
    queryKey: ['shared-directory', rootMatch.fileId],
    queryFn: () => listSharedDirectory(rootMatch.fileId),
  })
  for (const segment of remaining) {
    const dir = pool.find((f) => f.directory && f.name === segment)
    if (!dir) return null
    trail.push({ fileId: dir.fileId, name: dir.name })
    pool = await queryClient.fetchQuery({
      queryKey: ['shared-directory', dir.fileId],
      queryFn: () => listSharedDirectory(dir.fileId),
    })
  }
  return trail
}

export function SharedWithMeExplorer() {
  // `?file=<id>` deep link — a notification or a "위치" link lands here with the file pre-selected.
  const { selectedFileId, setSelectedFileId, clearSelection } = useFileDeeplink()
  const [trail, setTrail] = useState<Crumb[]>([])
  const queryClient = useQueryClient()

  const current: Crumb | null = trail[trail.length - 1] ?? null
  const root = useSharedWithMe()
  const nested = useSharedDirectory(current?.fileId ?? null)
  const { data: files, isLoading, isError } = current ? nested : root

  // A deep-linked file not present at the current level isn't necessarily missing — it's likely
  // nested inside a shared folder the trail hasn't walked into yet. Resolve and jump there once.
  // Guards against a stale response by id, not a cleanup-driven `cancelled` flag — StrictMode
  // replays this effect (setup → cleanup → setup) synchronously on mount, and a cleanup-set flag
  // would mark the one call that actually started the real fetch as cancelled before it resolves.
  // `resolvingFor` isn't reset by that replay (refs survive it), so both invokes agree on the same
  // targetId either way, and it still correctly drops a response superseded by a newer deep link
  // (including one that lands on an already-visible file, which keeps the guard in step with it).
  const resolvingFor = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedFileId || files?.some((f) => f.fileId === selectedFileId)) {
      resolvingFor.current = selectedFileId ?? null
      return
    }
    if (resolvingFor.current === selectedFileId) return
    const targetId = selectedFileId
    resolvingFor.current = targetId
    resolveSharedTrail(queryClient, targetId)
      .then((resolved) => {
        if (resolvingFor.current !== targetId) return
        // `[]` is itself a valid answer ("it's at the root") — only a genuinely unresolvable
        // trail (not shared with this caller at all, or a directory lookup failed) leaves the
        // latch set, and clearing it here lets a later retry (e.g. after the share lands) work.
        if (resolved) setTrail(resolved)
        else resolvingFor.current = null
      })
      .catch(() => {
        if (resolvingFor.current === targetId) resolvingFor.current = null
      })
  }, [selectedFileId, files, queryClient])

  const onSelect = (file: FileEntry) => setSelectedFileId(file.fileId)

  // FileList navigates by full path; match it back to the rendered entry to get its id.
  const onNavigate = (targetPath: string) => {
    const entry = (files ?? []).find((f) => f.directory && joinPath(f.path, f.name) === targetPath)
    if (entry) {
      clearSelection()
      setTrail((t) => [...t, { fileId: entry.fileId, name: entry.name }])
    }
  }

  const goToDepth = (depth: number) => {
    clearSelection()
    setTrail((t) => t.slice(0, depth))
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <PageHeader
          title={
            trail.length === 0 ? (
              '공유 문서함'
            ) : (
              <nav className="-ml-1.5 flex min-w-0 items-center gap-1 text-lg">
                <button
                  type="button"
                  onClick={() => goToDepth(0)}
                  className="rounded-md px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  공유 문서함
                </button>
                {trail.map((crumb, index) => {
                  const isLast = index === trail.length - 1
                  return (
                    <span key={crumb.fileId} className="flex min-w-0 items-center gap-1">
                      <ChevronRightIcon size={16} className="text-slate-400 dark:text-slate-600" />
                      {isLast ? (
                        <span className="truncate rounded-md px-1.5 py-0.5 font-medium text-slate-900 dark:text-slate-100">
                          {crumb.name}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => goToDepth(index + 1)}
                          className="truncate rounded-md px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          {crumb.name}
                        </button>
                      )}
                    </span>
                  )
                })}
              </nav>
            )
          }
        >
          <ViewToggle />
        </PageHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="공유받은 파일을 불러오지 못했습니다" />}
          {files && (
            <FileList
              files={files}
              selectedFileId={selectedFileId}
              onNavigate={onNavigate}
              onSelect={onSelect}
              onFileDeleted={(fileId) => setSelectedFileId((cur) => (cur === fileId ? null : cur))}
              onClearSelection={clearSelection}
              navigable
              // A shared folder's contents inherit its "공유한 사용자"/"공유된 날짜" attribution
              // (server-attached, see ListSharedDirectoryService), so the columns stay the same
              // whether you're at the root or three folders deep.
              showSharedBy
              // Root list arrives from the server already ordered by "shared on" desc; keep it.
              // Inside a folder it's an unordered directory listing, so let the client sort.
              preserveOrder={!current}
              dateColumn={{ label: '공유된 날짜', getValue: (file) => file.sharedAt }}
              emptyLabel={current ? '이 폴더는 비어 있습니다' : '아직 공유받은 파일이 없습니다'}
              emptyIcon={UsersIcon}
            />
          )}
        </div>
      </div>

      {selectedFileId && <FileDetailPanel fileId={selectedFileId} onClose={clearSelection} />}
    </div>
  )
}
