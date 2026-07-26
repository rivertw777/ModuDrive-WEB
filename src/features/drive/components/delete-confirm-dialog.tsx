import { Dialog } from '@/components/ui/dialog'
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
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">{fileName}</span>을(를) 삭제할까요? 이 작업은 되돌릴 수
        없습니다.
      </p>

      {deleteFile.isError && <p className="mt-2 text-sm text-red-600">{deleteFile.error.message}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleteFile.isPending}
          className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {deleteFile.isPending ? '삭제 중...' : '삭제'}
        </button>
      </div>
    </Dialog>
  )
}
