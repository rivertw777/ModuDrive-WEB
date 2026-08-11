import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { runBatch } from '@/utils/run-batch'
import { useDeleteFile } from '../api/delete-file'

export function DeleteConfirmDialog({
  open,
  onClose,
  files,
  onDeleted,
}: {
  open: boolean
  onClose: () => void
  files: { fileId: string; name: string }[]
  onDeleted: () => void
}) {
  const deleteFile = useDeleteFile()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onConfirm = async () => {
    setError(null)
    setIsSubmitting(true)
    const failed = await runBatch(files, (file) => deleteFile.mutateAsync(file.fileId))
    setIsSubmitting(false)

    if (failed.length < files.length) onDeleted() // at least one succeeded — let the parent prune it
    if (failed.length > 0) {
      setError(`${failed.map((file) => file.name).join(', ')} 삭제에 실패했습니다`)
      return
    }
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="파일 삭제">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {files.length === 1 ? (
          <>
            <span className="font-medium text-slate-900 dark:text-slate-100">{files[0].name}</span>
            을(를)
          </>
        ) : (
          <>
            선택한{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {files.length}개 항목
            </span>
            을
          </>
        )}{' '}
        삭제할까요? 이 작업은 되돌릴 수 없습니다.
      </p>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isSubmitting ? '삭제 중...' : '삭제'}
        </Button>
      </div>
    </Dialog>
  )
}
