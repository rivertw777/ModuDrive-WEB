import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useEmptyTrash } from '../api/empty-trash'

export function EmptyTrashConfirmDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const emptyTrash = useEmptyTrash()
  const [error, setError] = useState<string | null>(null)

  const onConfirm = async () => {
    setError(null)
    try {
      await emptyTrash.mutateAsync()
      onClose()
    } catch {
      setError('휴지통 비우기에 실패했습니다')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="휴지통 비우기">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        휴지통에 있는 모든 항목을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.
      </p>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={emptyTrash.isPending}
          className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {emptyTrash.isPending ? '삭제 중...' : '휴지통 비우기'}
        </Button>
      </div>
    </Dialog>
  )
}
