/** One picked item, addressed by its path relative to the folder being uploaded into.
 * `file` is null for a folder — the only way an empty folder can reach the batch. */
export type UploadEntry = { relativePath: string; file: File | null }

/** From an `<input type="file">`. A `webkitdirectory` pick fills `webkitRelativePath`
 * ("사진/2024/a.jpg") on every file; a plain multi-file pick leaves it empty. Empty folders
 * never show up this way — the browser doesn't report them. */
export function entriesFromFileList(files: Iterable<File>): UploadEntry[] {
  return Array.from(files, (file) => ({ relativePath: file.webkitRelativePath || file.name, file }))
}

/**
 * From a drop. Folders are walked recursively (empty ones included) via `webkitGetAsEntry`.
 * Must be called synchronously inside the drop handler: the browser clears `dataTransfer` as
 * soon as the handler returns, so every entry is taken out before the first await.
 */
export function entriesFromDataTransfer(dataTransfer: DataTransfer): Promise<UploadEntry[]> {
  const roots = Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null))
  if (roots.length === 0 || roots.some((root) => root === null)) {
    // No entry API (or an item it can't describe): files only, folders can't be read.
    return Promise.resolve(entriesFromFileList(dataTransfer.files))
  }
  return (async () => {
    const entries: UploadEntry[] = []
    for (const root of roots) {
      if (root) await walk(root, root.name, entries)
    }
    return entries
  })()
}

function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
  return entry.isFile
}

function isDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
  return entry.isDirectory
}

async function walk(entry: FileSystemEntry, path: string, out: UploadEntry[]) {
  if (isFileEntry(entry)) {
    const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject))
    out.push({ relativePath: path, file })
    return
  }
  if (!isDirectoryEntry(entry)) return
  out.push({ relativePath: path, file: null })
  const reader = entry.createReader()
  // readEntries hands back at most ~100 entries per call — keep reading until it returns none.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    )
    if (batch.length === 0) return
    for (const child of batch) {
      await walk(child, `${path}/${child.name}`, out)
    }
  }
}
