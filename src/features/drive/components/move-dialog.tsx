import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { runBatch } from '@/utils/run-batch'
import { useMoveFile } from '../api/move-file'

const schema = z.object({
  path: z.string().regex(/^\//, "경로는 '/'로 시작해야 합니다"),
})

type FormValues = z.infer<typeof schema>

export function MoveDialog({
  open,
  onClose,
  fileIds,
  currentPath,
}: {
  open: boolean
  onClose: () => void
  fileIds: string[]
  currentPath: string
}) {
  const moveFile = useMoveFile()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), values: { path: currentPath } })

  const onSubmit = async (values: FormValues) => {
    setError(null)
    setIsSubmitting(true)
    const failed = await runBatch(fileIds, (fileId) =>
      moveFile.mutateAsync({ fileId, path: values.path }),
    )
    setIsSubmitting(false)

    if (failed.length > 0) {
      setError(`${failed.length}개 항목을 이동하지 못했습니다`)
      return
    }
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="이동">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {fileIds.length > 1 && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            선택한 {fileIds.length}개 항목을 이동합니다.
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            대상 경로
          </label>
          <input
            autoFocus
            placeholder="/문서/사진"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            {...register('path')}
          />
          {errors.path && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.path.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? '이동 중...' : '이동'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
