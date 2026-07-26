import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useMoveFile } from '../api/move-file'

const schema = z.object({
  path: z.string().regex(/^\//, "경로는 '/'로 시작해야 합니다"),
})

type FormValues = z.infer<typeof schema>

export function MoveDialog({
  open,
  onClose,
  fileId,
  currentPath,
}: {
  open: boolean
  onClose: () => void
  fileId: string
  currentPath: string
}) {
  const moveFile = useMoveFile()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), values: { path: currentPath } })

  const onSubmit = (values: FormValues) => {
    moveFile.mutate(
      { fileId, path: values.path },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title="이동">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">대상 경로</label>
          <input
            autoFocus
            placeholder="/문서/사진"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            {...register('path')}
          />
          {errors.path && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.path.message}</p>}
        </div>

        {moveFile.isError && <p className="text-sm text-red-600 dark:text-red-400">{moveFile.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={moveFile.isPending}>
            {moveFile.isPending ? '이동 중...' : '이동'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
