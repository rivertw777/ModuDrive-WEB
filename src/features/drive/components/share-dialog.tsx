import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useShareFile } from '../api/share-file'

const schema = z.object({
  sharedWithUserId: z.string().uuid('유효한 회원 UUID가 아닙니다'),
  permission: z.enum(['READ', 'WRITE']),
})

type FormValues = z.infer<typeof schema>

export function ShareDialog({
  open,
  onClose,
  fileId,
}: {
  open: boolean
  onClose: () => void
  fileId: string
}) {
  const shareFile = useShareFile()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { permission: 'READ' } })

  const onSubmit = (values: FormValues) => {
    shareFile.mutate(
      { fileId, ...values },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title="파일 공유">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">대상 회원 UUID</label>
          <input
            placeholder="11111111-1111-1111-1111-111111111111"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            {...register('sharedWithUserId')}
          />
          {errors.sharedWithUserId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sharedWithUserId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">권한</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            {...register('permission')}
          >
            <option value="READ">읽기</option>
            <option value="WRITE">쓰기</option>
          </select>
        </div>

        {shareFile.isError && <p className="text-sm text-red-600 dark:text-red-400">{shareFile.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={shareFile.isPending}>
            {shareFile.isPending ? '공유 중...' : '공유'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
