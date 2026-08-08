import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useSignup } from '../api/signup'

const signupSchema = z
  .object({
    name: z.string().min(1, '이름은 필수입니다'),
    email: z.string().min(1, '이메일은 필수입니다').email('유효한 이메일 형식이 아닙니다'),
    password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인은 필수입니다'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const signup = useSignup()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) })

  const onSubmit = (values: SignupFormValues) => {
    signup.mutate(values, { onSuccess })
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className={labelClass}>
          이름
        </label>
        <input id="name" type="text" autoComplete="name" className={inputClass} {...register('name')} />
        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          이메일
        </label>
        <input id="email" type="email" autoComplete="email" className={inputClass} {...register('email')} />
        {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          {...register('password')}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          비밀번호 확인
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>

      {signup.isError && <p className="text-sm text-red-600 dark:text-red-400">{signup.error.message}</p>}

      <Button type="submit" variant="primary" disabled={signup.isPending} className="w-full">
        {signup.isPending ? '가입 중...' : '회원가입'}
      </Button>
    </form>
  )
}
