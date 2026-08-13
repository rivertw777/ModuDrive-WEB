import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useShareFile } from '../api/share-file'
import { RoleSelect } from './role-select'

const schema = z.object({
  email: z.string().email('유효한 이메일이 아닙니다'),
  role: z.enum(['VIEWER', 'EDITOR']),
})

type FormValues = z.infer<typeof schema>

export function AddMemberForm({ fileId }: { fileId: string }) {
  const shareFile = useShareFile()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'VIEWER' } })

  const onSubmit = (values: FormValues) => {
    shareFile.mutate({ fileId, ...values }, { onSuccess: () => reset() })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-1.5" noValidate>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="이메일로 초대"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          {...register('email')}
        />
        <RoleSelect value={watch('role')} onChange={(role) => setValue('role', role)} />
        <Button type="submit" variant="primary" disabled={shareFile.isPending}>
          초대
        </Button>
      </div>
      {errors.email && <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}
      {shareFile.isError && <p className="text-sm text-red-600 dark:text-red-400">{shareFile.error.message}</p>}
    </form>
  )
}
