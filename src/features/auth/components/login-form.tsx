import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useLogin } from '../api/login'

const loginSchema = z.object({
  email: z.string().min(1, '이메일은 필수입니다').email('유효한 이메일 형식이 아닙니다'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const inputClass =
  'mt-1.5 w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-1 ring-inset ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-500'
const labelClass = 'block text-[13px] font-medium text-slate-500'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className={labelClass}>
          이메일
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputClass}
          {...register('email')}
        />
        {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
          {...register('password')}
        />
        {errors.password && (
          <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {login.isError && <p className="text-sm text-red-600">{login.error.message}</p>}

      <Button
        type="submit"
        variant="primary"
        disabled={login.isPending}
        className="w-full py-3 shadow-lg shadow-brand-600/20"
      >
        {login.isPending ? '로그인 중...' : '로그인'}
      </Button>
    </form>
  )
}
