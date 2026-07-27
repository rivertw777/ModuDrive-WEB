import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteFile } from '../api/delete-file'

export function DeleteConfirmDialog({
  open,
  onClose,
  fileId,
  fileName,
  onDeleted,
}: {
  open: boolean
  onClose: () => void
  fileId: string
  fileName: string
  onDeleted: () => void
}) {
  const deleteFile = useDeleteFile()

  const onConfirm = () => {
    deleteFile.mutate(fileId, {
      onSuccess: () => {
        onDeleted()
        onClose()
      },
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="파일 삭제">
      <p className="text-sm text-slate-600 dark:text-neutral-400">
        <span className="font-medium text-slate-900 dark:text-neutral-100">{fileName}</span>을(를) 삭제할까요? 이
        작업은 되돌릴 수 없습니다.
      </p>

      {deleteFile.isError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteFile.error.message}</p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={deleteFile.isPending}
          className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleteFile.isPending ? '삭제 중...' : '삭제'}
        </Button>
      </div>
    </Dialog>
  )
}
