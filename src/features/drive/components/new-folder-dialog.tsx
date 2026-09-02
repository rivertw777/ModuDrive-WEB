import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreateDirectory } from '../api/create-directory'

const schema = z.object({
  name: z.string().min(1, '폴더 이름은 필수입니다'),
})

type FormValues = z.infer<typeof schema>

export function NewFolderDialog({
  open,
  onClose,
  path,
}: {
  open: boolean
  onClose: () => void
  path: string
}) {
  const createDirectory = useCreateDirectory()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (values: FormValues) => {
    createDirectory.mutate(
      { name: values.name, path },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title="새 폴더">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <input
            autoFocus
            placeholder="폴더 이름"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
        </div>

        {createDirectory.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">{createDirectory.error.message}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={createDirectory.isPending}>
            {createDirectory.isPending ? '만드는 중...' : '만들기'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
