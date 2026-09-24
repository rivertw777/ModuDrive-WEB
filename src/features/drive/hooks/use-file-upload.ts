import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  MAX_BATCH_ITEMS,
  MAX_FILE_SIZE,
  batchConflicts,
  createUploadBatch,
  uploadBytes,
  type BatchCreatedItem,
  type BatchItem,
  type ConflictResolution,
} from '../api/upload-file'
import type { UploadEntry } from '../utils/collect-upload-entries'

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

/**
 * Uploads a picked selection into `path` (API .docs/spec/001-file-upload-spec.md §2, §9): the
 * whole tree is registered with one batch request, then each file's bytes go up one at a time.
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

    const run = queue.current.then(() => uploadSelection(rows, accepted))
    // A run that somehow throws must not jam every later pick behind a rejected promise.
    queue.current = run.catch(() => undefined)
    return queue.current
  }

  const uploadSelection = async (rows: Map<string, UploadItem>, accepted: UploadEntry[]) => {
    const items: BatchItem[] = accepted.map((entry) =>
      entry.file
        ? { relativePath: entry.relativePath, directory: false, size: entry.file.size }
        : { relativePath: entry.relativePath, directory: true },
    )
    const resolutions: Record<string, ConflictResolution> = {}
    let created: BatchCreatedItem[] = []
    if (items.length > 0) {
      try {
        for (;;) {
          try {
            created = await createUploadBatch(path, items, resolutions)
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
        setUploadError(error instanceof Error ? error.message : '업로드에 실패했습니다')
        for (const row of rows.values()) {
          row.status = 'error'
          sync(row)
        }
        return
      }
      // Rows exist as soon as the batch commits — show them before any byte goes out.
      void queryClient.invalidateQueries({ queryKey: ['directory'] })
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
    for (const item of created) {
      const row = rows.get(item.relativePath)
      if (row && row.name !== item.name) {
        row.name = item.name
        sync(row)
      }
    }
    // Nothing to send for an empty folder (or one whose only files were over 5GB): it's settled
    // the moment the batch commits, not after the rest of the selection finishes.
    for (const row of rows.values()) {
      if (!skippedIds.has(row.id) && row.totalBytes === 0 && row.doneCount + row.errorCount === row.fileCount) {
        finish(row)
      }
    }

    const fileIds = new Map(created.map((item) => [item.relativePath, item.fileId]))
    const completedBytes = new Map<string, number>()
    for (const entry of accepted) {
      const row = rows.get(topLevelName(entry.relativePath))
      if (!entry.file || !row || skippedIds.has(row.id)) continue
      const fileId = fileIds.get(entry.relativePath)
      if (!fileId) {
        // The batch should have created every file it wasn't told to skip.
        row.errorCount++
        sync(row)
        continue
      }
      const file = entry.file
      const before = completedBytes.get(row.id) ?? 0
      try {
        await uploadBytes(fileId, file, (sent) => {
          row.sentBytes = before + sent
          sync(row)
        })
        row.doneCount++
      } catch {
        // Only this file fails; it stays PENDING in the list and the rest keep going.
        row.errorCount++
      }
      completedBytes.set(row.id, before + file.size)
      row.sentBytes = before + file.size
      sync(row)
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
