import { EmptyState } from '@/components/ui/state'
import { joinPath, type FileEntry } from '../types'

function formatSize(bytes: number | null) {
  if (bytes === null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
        <tr className="border-b border-slate-200 text-left text-slate-500">
          <th className="py-2 font-medium">이름</th>
          <th className="py-2 font-medium">크기</th>
          <th className="py-2 font-medium">상태</th>
        </tr>
      </thead>
      <tbody>
        {visible.map((file) => (
          <tr
            key={file.fileId}
            onClick={() =>
              file.directory ? onNavigate(joinPath(path, file.name)) : onSelect(file)
            }
            className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${
              selectedFileId === file.fileId ? 'bg-slate-50' : ''
            }`}
          >
            <td className="py-2">
              {file.directory ? '📁' : '📄'} {file.name}
            </td>
            <td className="py-2 text-slate-500">{file.directory ? '-' : formatSize(file.fileSize)}</td>
            <td className="py-2 text-slate-500">{file.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
