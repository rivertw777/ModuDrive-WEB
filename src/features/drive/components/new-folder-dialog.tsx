import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        {createDirectory.isError && (
          <p className="text-sm text-red-600">{createDirectory.error.message}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={createDirectory.isPending}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {createDirectory.isPending ? '만드는 중...' : '만들기'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
