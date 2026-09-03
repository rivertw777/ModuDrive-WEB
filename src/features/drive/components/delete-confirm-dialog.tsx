import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { runBatch } from '@/utils/run-batch'
import { useDeleteFile } from '../api/delete-file'
import { listFileShares } from '../api/list-file-shares'

type Target = { fileId: string; name: string; directory?: boolean }

export function DeleteConfirmDialog({
  open,
  onClose,
  files,
  onDeleted,
}: {
  open: boolean
  onClose: () => void
  files: Target[]
  onDeleted: () => void
}) {
  const deleteFile = useDeleteFile()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Which targets are currently shared — directly, inherited from a parent folder, or reachable
  // through a parent that's an "anyone with the link" folder. Trashing revokes that access for
  // everyone until the owner restores it, so it's worth a heads-up before confirming.
  const shareQueries = useQueries({
    queries: files.map((file) => ({
      queryKey: ['file-shares', file.fileId],
      queryFn: () => listFileShares(file.fileId),
      enabled: open,
    })),
  })
  const sharedNames = files
    .filter((_, i) => {
      const data = shareQueries[i]?.data
      return !!data && (data.shares.length > 0 || data.inheritedLinks.length > 0)
    })
    .map((file) => file.name)

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

  const onlyFolders = files.length > 0 && files.every((file) => file.directory)

  return (
    <Dialog open={open} onClose={onClose} title="휴지통으로 이동">
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
        휴지통으로 옮길까요? 휴지통에서 복원할 수 있습니다.
      </p>

      {sharedNames.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
          {sharedNames.length === files.length ? (
            <>현재 공유 중{onlyFolders ? '인 폴더입니다.' : '입니다.'}</>
          ) : (
            <>
              <span className="font-medium">{sharedNames.join(', ')}</span> 은(는) 현재 공유 중입니다.
            </>
          )}{' '}
          휴지통으로 옮기면{onlyFolders ? ' 하위 항목을 포함해' : ''} 공유된 사용자는 접근할 수
          없게 되며, 복원하면 다시 접근할 수 있습니다.
        </div>
      )}

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
          {isSubmitting ? '이동 중...' : '휴지통으로 이동'}
        </Button>
      </div>
    </Dialog>
  )
}
