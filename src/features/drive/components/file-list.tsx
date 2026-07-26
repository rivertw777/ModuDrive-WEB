import { EmptyState } from '@/components/ui/state'
import { FileIcon, FolderIcon, ImageIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { formatFileSize, isImageFile, joinPath, type FileEntry } from '../types'

function EntryIcon({ file }: { file: FileEntry }) {
  if (file.directory) return <FolderIcon size={20} className="shrink-0 text-violet-500" />
  if (isImageFile(file.name)) return <ImageIcon size={20} className="shrink-0 text-emerald-500" />
  return <FileIcon size={20} className="shrink-0 text-slate-400 dark:text-neutral-500" />
}

export function FileList({
  path,
  files,
  selectedFileId,
  onNavigate,
  onSelect,
}: {
  path: string
  files: FileEntry[]
  selectedFileId: string | null
  onNavigate: (path: string) => void
  onSelect: (file: FileEntry) => void
}) {
  const visible = files.filter((file) => file.status !== 'DELETED')

  if (visible.length === 0) {
    return <EmptyState label="이 폴더는 비어 있습니다" />
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
          <th className="py-2 font-medium">이름</th>
          <th className="w-28 py-2 text-right font-medium">크기</th>
        </tr>
      </thead>
      <tbody>
        {visible.map((file) => (
          <tr
            key={file.fileId}
            onClick={() => (file.directory ? onNavigate(joinPath(path, file.name)) : onSelect(file))}
            className={cn(
              'cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-neutral-900 dark:hover:bg-neutral-900',
              selectedFileId === file.fileId && 'bg-violet-50 hover:bg-violet-50 dark:bg-violet-950 dark:hover:bg-violet-950',
            )}
          >
            <td className="py-2.5">
              <span className="flex items-center gap-2.5 text-slate-800 dark:text-neutral-200">
                <EntryIcon file={file} />
                {file.name}
              </span>
            </td>
            <td className="py-2.5 text-right text-slate-500 dark:text-neutral-400">
              {file.directory ? '-' : formatFileSize(file.fileSize)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
