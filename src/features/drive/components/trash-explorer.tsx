import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { Button } from '@/components/ui/button'
import { FileIcon, FolderIcon, ImageIcon } from '@/components/ui/icons'
import { useTrash } from '../api/list-trash'
import { useRestoreFile } from '../api/restore-file'
import { formatFileSize, isImageFile, type FileEntry } from '../types'

function EntryIcon({ file }: { file: FileEntry }) {
  if (file.directory) return <FolderIcon size={20} className="shrink-0 text-violet-500" />
  if (isImageFile(file.name)) return <ImageIcon size={20} className="shrink-0 text-emerald-500" />
  return <FileIcon size={20} className="shrink-0 text-slate-400 dark:text-slate-500" />
}

export function TrashExplorer() {
  const { data: files, isLoading, isError } = useTrash()
  const restoreFile = useRestoreFile()

  return (
    <div className="p-6">
      <h1 className="pb-4 text-lg font-medium text-slate-900 dark:text-slate-100">휴지통</h1>

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="휴지통을 불러오지 못했습니다" />}
      {files && files.length === 0 && <EmptyState label="휴지통이 비어 있습니다" />}
      {files && files.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="py-2 font-medium">이름</th>
              <th className="w-28 py-2 text-right font-medium">크기</th>
              <th className="w-24 py-2 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr
                key={file.fileId}
                className="border-b border-slate-100 dark:border-slate-800"
              >
                <td className="py-2.5">
                  <span className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
                    <EntryIcon file={file} />
                    {file.name}
                  </span>
                </td>
                <td className="py-2.5 text-right text-slate-500 dark:text-slate-400">
                  {file.directory ? '-' : formatFileSize(file.fileSize)}
                </td>
                <td className="py-2.5 text-right">
                  <Button
                    variant="ghost"
                    onClick={() => restoreFile.mutate(file.fileId)}
                    disabled={restoreFile.isPending}
                  >
                    복구
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
