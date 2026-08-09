import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePurgeFile } from '../api/purge-file'

export function PurgeConfirmDialog({
  open,
  onClose,
  fileId,
  fileName,
  onPurged,
}: {
  open: boolean
  onClose: () => void
  fileId: string
  fileName: string
  onPurged?: () => void
}) {
  const purgeFile = usePurgeFile()

  const onConfirm = () => {
    purgeFile.mutate(fileId, {
      onSuccess: () => {
        onPurged?.()
        onClose()
      },
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="영구 삭제">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        <span className="font-medium text-slate-900 dark:text-slate-100">{fileName}</span>을(를) 영구
        삭제할까요? 이 작업은 되돌릴 수 없습니다.
      </p>

      {purgeFile.isError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{purgeFile.error.message}</p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={purgeFile.isPending}
          className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {purgeFile.isPending ? '삭제 중...' : '영구 삭제'}
        </Button>
      </div>
    </Dialog>
  )
}
