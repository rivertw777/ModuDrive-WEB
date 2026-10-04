import { useState } from 'react'
import { setDragPreview } from '@/hooks/use-row-selection'
import { actionErrorText } from '@/stores/alert-store'
import { DRAG_MIME, type FileEntry } from '@/types/file'
import { joinPath } from '@/utils/file'
import { runBatch } from '@/utils/run-batch'
import { useMoveFile } from '../api/move-file'

/** Drag rows onto a folder row of the same list to move them there. `files` is everything the
 * list holds (not just the rendered window), so a drop resolves ids the user dragged. */
export function useFileDragMove({
  files,
  selected,
  setSelected,
  setActionError,
}: {
  files: FileEntry[]
  selected: Set<string>
  setSelected: (ids: Set<string>) => void
  setActionError: (message: string | null) => void
}) {
  const moveFile = useMoveFile()
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  // Ids currently being dragged (set from this same list's onDragStart) — lets onDragOver reject
  // a target that is itself part of the drag before it ever reaches onDrop (Google Drive-style:
  // dropping a selection onto one of its own members is refused outright, not partially applied).
  const [draggingIds, setDraggingIds] = useState<Set<string>>(new Set())

  const onDragStart = (event: React.DragEvent, file: FileEntry) => {
    const ids = selected.has(file.fileId) && selected.size > 1 ? [...selected] : [file.fileId]
    if (ids.length === 1) setSelected(new Set(ids))
    setDraggingIds(new Set(ids))
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids))
    setDragPreview(event, file.name, ids.length)
  }

  const onDrop = async (event: React.DragEvent, target: FileEntry) => {
    event.preventDefault()
    setDragOverId(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(event.dataTransfer.getData(DRAG_MIME))
    } catch {
      return
    }
    if (!Array.isArray(parsed)) return
    // The target is itself one of the dragged items (e.g. a file + folder selected together,
    // dropped on that same folder) — refuse the whole drop rather than moving just the rest.
    if (parsed.includes(target.fileId)) return

    // Only ids this list actually rendered, excluding the drop target itself and any dragged
    // directory that the target sits inside of (would otherwise move a folder into its own subtree).
    const byId = new Map(files.map((file) => [file.fileId, file]))
    const targetFullPath = joinPath(target.path, target.name)
    const ids = parsed.filter((id): id is string => {
      if (typeof id !== 'string' || id === target.fileId) return false
      const source = byId.get(id)
      if (!source || source.path === targetFullPath) return false
      if (!source.directory) return true
      const sourceFullPath = joinPath(source.path, source.name)
      return targetFullPath !== sourceFullPath && !targetFullPath.startsWith(`${sourceFullPath}/`)
    })
    if (ids.length === 0) return

    setActionError(null)
    const { failed, error } = await runBatch(ids, (fileId) =>
      moveFile.mutateAsync({ fileId, path: targetFullPath }),
    )
    setSelected(new Set())
    if (failed.length > 0) setActionError(actionErrorText(error))
  }

  // Spread onto a row/card: every row can be dragged, only folder rows accept a drop.
  const dragHandlers = (file: FileEntry) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent) => onDragStart(event, file),
    onDragEnd: () => setDraggingIds(new Set()),
    onDragOver: file.directory
      ? (event: React.DragEvent) => {
          if (!event.dataTransfer.types.includes(DRAG_MIME)) return
          // This row is itself part of the drag (e.g. file + folder selected together, hovering
          // that same folder) — leave preventDefault uncalled so the browser shows "no drop"
          // instead of highlighting it as a valid target.
          if (draggingIds.has(file.fileId)) return
          event.preventDefault()
          setDragOverId(file.fileId)
        }
      : undefined,
    onDragLeave: file.directory
      ? () => setDragOverId((cur) => (cur === file.fileId ? null : cur))
      : undefined,
    onDrop: file.directory ? (event: React.DragEvent) => onDrop(event, file) : undefined,
  })

  return { dragOverId, dragHandlers }
}
