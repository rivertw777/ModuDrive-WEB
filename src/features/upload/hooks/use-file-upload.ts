import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  MAX_BATCH_ITEMS,
  MAX_COMMIT_FOLDERS,
  MAX_FILE_SIZE,
  batchConflicts,
  commitFolders,
  groupForCommit,
  planUploadBatch,
  uploadGroup,
  type BatchPlannedItem,
  type BatchItem,
  type ConflictResolution,
  type UploadTarget,
} from '../api/upload-file'
import type { UploadEntry } from '../utils/collect-upload-entries'
import { hashFile } from '../utils/hash-in-worker'
import { actionErrorText } from '@/stores/alert-store'

/** How the user resolved a same-name conflict; `null` (from 취소) skips just that item. */
export type ConflictChoice = 'replace' | 'keep-both'

/** The top-level item a conflict dialog is asking about. */
export type UploadConflict = { name: string; directory: boolean }

/** One row in the upload status panel — one per top-level item the user picked, so a folder
 * is a single row however many files it holds. */
export type UploadItem = {
  id: string
  name: string
  directory: boolean
  /** Bytes of the files actually being sent — an over-5GB file never counts toward it. */
  totalBytes: number
  sentBytes: number
  fileCount: number
  doneCount: number
  errorCount: number
  /** Why the row failed before anything was sent, e.g. "5GB 초과". */
  errorReason?: string
  status: 'uploading' | 'done' | 'error'
}

const RESOLUTION: Record<ConflictChoice, ConflictResolution> = {
  replace: 'REPLACE',
  'keep-both': 'KEEP_BOTH',
}

const topLevelName = (relativePath: string) => relativePath.split('/')[0]
const asError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)))
const childPath = (parent: string, name: string) => (parent === '/' ? `/${name}` : `${parent}/${name}`)

/**
 * Uploads a picked selection into `path` (API .docs/spec/001-file-upload-spec.md §2): one batch
 * request checks the whole tree for name conflicts and says where everything lands, then the files
 * are committed a group at a time (which creates them and the folders above them), and the folders
 * no file commit made — empty ones, or ones whose files all failed — are committed last.
 * Hashing starts the moment files are picked, so it runs while the batch check and any conflict
 * dialog wait.
 * A name conflict pauses on that one item (`conflict`) until the caller answers via
 * `resolveConflict`; a failed file only fails itself, never the rest of the selection.
 */
export function useFileUpload(path: string) {
  const queryClient = useQueryClient()
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<UploadConflict | null>(null)
  const decide = useRef<((choice: ConflictChoice | null) => void) | null>(null)
  const nextId = useRef(0)
  // A pick made while another is still uploading shows its rows right away but waits its turn:
  // bytes go one file at a time across picks too, and two batches can never both be waiting on
  // the one conflict dialog.
  const queue = useRef<Promise<void>>(Promise.resolve())

  const resolveConflict = (choice: ConflictChoice | null) => {
    setConflict(null)
    decide.current?.(choice)
    decide.current = null
  }

  const askConflict = (next: UploadConflict) =>
    new Promise<ConflictChoice | null>((resolve) => {
      decide.current = resolve
      setConflict(next)
    })

  /** Pushes the local row's current counters into state. */
  const sync = (row: UploadItem) =>
    setUploads((prev) => prev.map((item) => (item.id === row.id ? { ...row } : item)))

  const finish = (row: UploadItem) => {
    row.status = row.errorCount > 0 ? 'error' : 'done'
    sync(row)
  }

  /** Always resolves — a failure lands in `uploadError` or on a row, never as a rejection. */
  const onUpload = (entries: UploadEntry[]): Promise<void> => {
    setUploadError(null)
    if (entries.length === 0) return queue.current

    const rows = new Map<string, UploadItem>()
    const accepted: UploadEntry[] = []
    for (const entry of entries) {
      const name = topLevelName(entry.relativePath)
      let row = rows.get(name)
      if (!row) {
        row = {
          id: String(nextId.current++),
          name,
          directory: false,
          totalBytes: 0,
          sentBytes: 0,
          fileCount: 0,
          doneCount: 0,
          errorCount: 0,
          status: 'uploading',
        }
        rows.set(name, row)
      }
      if (entry.relativePath !== name || entry.file === null) row.directory = true
      if (entry.file) {
        row.fileCount++
        // Over 5GB can never be stored — fail it up front and send the rest.
        if (entry.file.size > MAX_FILE_SIZE) {
          row.errorCount++
          row.errorReason = '5GB 초과'
          continue
        }
        row.totalBytes += entry.file.size
      }
      accepted.push(entry)
    }
    if (accepted.length > MAX_BATCH_ITEMS) {
      setUploadError(`한 번에 ${MAX_BATCH_ITEMS.toLocaleString()}개까지 올릴 수 있습니다.`)
      return queue.current
    }
    setUploads((prev) => [...prev, ...Array.from(rows.values(), (row) => ({ ...row }))])

    // Queued in pick order on the hashing pool, so earlier picks are still hashed first.
    const hashes = new Map<File, Promise<string[]>>()
    for (const { file } of accepted) {
      if (!file) continue
      const hashing = hashFile(file)
      hashing.catch(() => undefined) // awaited per group; this only keeps a skipped file's failure handled
      hashes.set(file, hashing)
    }

    const run = queue.current.then(() => uploadSelection(rows, accepted, hashes))
    // A run that somehow throws must not jam every later pick behind a rejected promise.
    queue.current = run.catch(() => undefined)
    return queue.current
  }

  const uploadSelection = async (
    rows: Map<string, UploadItem>,
    accepted: UploadEntry[],
    hashes: Map<File, Promise<string[]>>,
  ) => {
    const items: BatchItem[] = accepted.map((entry) =>
      entry.file
        ? { relativePath: entry.relativePath, directory: false, size: entry.file.size }
        : { relativePath: entry.relativePath, directory: true },
    )
    const resolutions: Record<string, ConflictResolution> = {}
    let planned: BatchPlannedItem[] = []
    if (items.length > 0) {
      try {
        for (;;) {
          try {
            planned = await planUploadBatch(path, items, resolutions)
            break
          } catch (error) {
            const conflicts = batchConflicts(error)
            // Only ask about names not answered yet; a 409 that repeats answered names only
            // is the server disagreeing with itself — give up rather than loop forever.
            const unanswered = conflicts?.filter((name) => !(name in resolutions)) ?? []
            if (unanswered.length === 0) throw error
            for (const name of unanswered) {
              const choice = await askConflict({ name, directory: rows.get(name)?.directory ?? false })
              resolutions[name] = choice ? RESOLUTION[choice] : 'SKIP'
            }
          }
        }
      } catch (error) {
        setUploadError(actionErrorText(error))
        for (const row of rows.values()) {
          row.status = 'error'
          sync(row)
        }
        return
      }
    }

    // A skipped conflict is always a whole top-level item — its row just goes away.
    const skippedIds = new Set(
      Array.from(rows.values())
        .filter((row) => resolutions[row.name] === 'SKIP')
        .map((row) => row.id),
    )
    if (skippedIds.size > 0) {
      setUploads((prev) => prev.filter((item) => !skippedIds.has(item.id)))
    }

    // Rows show where things actually landed — "사진" becomes "사진 (1)" on a folder clash.
    for (const item of planned) {
      const row = rows.get(item.relativePath)
      if (row && row.name !== item.name) {
        row.name = item.name
        sync(row)
      }
    }
    const targets = new Map(planned.map((item) => [item.relativePath, item]))
    // Folders known to exist: the target, the ones a replace merges into, and every folder above a
    // committed file (the commit creates them).
    const existingFolders = new Set([path])
    for (const item of planned) {
      if (item.directory && item.replaced) existingFolders.add(childPath(item.path, item.name))
    }
    const sendable: (UploadTarget & { row: UploadItem })[] = []
    for (const entry of accepted) {
      const row = rows.get(topLevelName(entry.relativePath))
      if (!entry.file || !row || skippedIds.has(row.id)) continue
      const target = targets.get(entry.relativePath)
      if (!target) {
        // The batch should have planned every file it wasn't told to skip.
        row.errorCount++
        sync(row)
        continue
      }
      sendable.push({ path: target.path, name: target.name, file: entry.file, row })
    }

    for (const group of groupForCommit(sendable)) {
      // Each file's bytes counted so far, so a row's total moves by the difference.
      const counted = group.map(() => 0)
      const count = (k: number, sent: number) => {
        const { row } = group[k]
        row.sentBytes += sent - counted[k]
        counted[k] = sent
        sync(row)
      }
      // A file that can't be read (deleted, no permission) fails alone; the rest of the group goes on.
      const blocklists = await Promise.allSettled(group.map(({ file }) => hashes.get(file) ?? hashFile(file)))
      const outcomes: (Error | null)[] = blocklists.map((hashed) =>
        hashed.status === 'rejected' ? asError(hashed.reason) : null,
      )
      const readable = group.flatMap((_, k) => (blocklists[k].status === 'fulfilled' ? [k] : []))
      if (readable.length > 0) {
        try {
          const sent = await uploadGroup(
            readable.map((k) => group[k]),
            readable.map((k) => (blocklists[k] as PromiseFulfilledResult<string[]>).value),
            (j, sentBytes) => count(readable[j], sentBytes),
          )
          sent.forEach((outcome, j) => (outcomes[readable[j]] = outcome))
        } catch (error) {
          // The commit itself failed: nothing in this group was created.
          for (const k of readable) outcomes[k] = asError(error)
        }
      }
      outcomes.forEach((outcome, k) => {
        const { row, path: folderPath, file } = group[k]
        if (outcome) {
          // Only this file fails; nothing was created for it and the rest keep going.
          row.errorCount++
        } else {
          row.doneCount++
          let folder = ''
          for (const segment of folderPath.split('/').filter(Boolean)) {
            folder = `${folder}/${segment}`
            existingFolders.add(folder)
          }
        }
        count(k, file.size)
      })
    }

    // The commit creates any missing folder above each one, so order and failed parents don't matter.
    const folders = planned.filter((item) => item.directory && !existingFolders.has(childPath(item.path, item.name)))
    for (let start = 0; start < folders.length; start += MAX_COMMIT_FOLDERS) {
      const chunk = folders.slice(start, start + MAX_COMMIT_FOLDERS)
      let failed: boolean[]
      try {
        failed = (await commitFolders(chunk.map(({ path: parent, name }) => ({ path: parent, name })))).map(
          (result) => result.error !== undefined,
        )
      } catch {
        failed = chunk.map(() => true)
      }
      chunk.forEach((item, k) => {
        const row = rows.get(topLevelName(item.relativePath))
        if (failed[k] && row) row.errorCount++
      })
    }

    for (const row of rows.values()) {
      if (!skippedIds.has(row.id) && row.status === 'uploading') finish(row)
    }
    void queryClient.invalidateQueries({ queryKey: ['directory'] })
    // Prefix match covers 'usage', 'all', and 'category' queries too.
    void queryClient.invalidateQueries({ queryKey: ['files'] })
  }

  const clearUploads = () => setUploads([])

  return {
    onUpload,
    uploads,
    clearUploads,
    uploadError,
    /** For failures outside the hook's own flow, e.g. a dropped folder that couldn't be read. */
    showUploadError: setUploadError,
    conflict,
    resolveConflict,
  }
}
