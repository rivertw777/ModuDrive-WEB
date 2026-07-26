import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useRenameFile } from '../api/rename-file'

const schema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
})

type FormValues = z.infer<typeof schema>

export function RenameDialog({
  open,
  onClose,
  fileId,
  currentName,
}: {
  open: boolean
  onClose: () => void
  fileId: string
  currentName: string
}) {
  const renameFile = useRenameFile()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), values: { name: currentName } })

  const onSubmit = (values: FormValues) => {
    renameFile.mutate(
      { fileId, name: values.name },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title="이름 변경">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <input
            autoFocus
            placeholder="이름"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
        </div>

        {renameFile.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">{renameFile.error.message}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={renameFile.isPending}>
            {renameFile.isPending ? '변경 중...' : '변경'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
