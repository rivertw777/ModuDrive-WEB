import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useLogin, useVerifyLogin, type LoginInput } from '../api/login'

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
  // Set once the password matched on a device this account hasn't verified: the emailed code
  // comes next. Kept so "코드 다시 받기" can just log in again (API spec 004 2-1).
  const [pending, setPending] = useState<LoginInput | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: (result) => (result.verificationRequired ? setPending(values) : onSuccess()),
    })
  }

  if (pending) {
    return (
      <LoginCodeStep
        email={pending.email}
        onSuccess={onSuccess}
        onResend={(onSent) =>
          login.mutate(pending, {
            onSuccess: (result) => (result.verificationRequired ? onSent() : onSuccess()),
          })
        }
        resendError={login.isError ? login.error.message : null}
        isResending={login.isPending}
        onBack={() => {
          login.reset()
          setPending(null)
        }}
      />
    )
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

type LoginCodeStepProps = {
  email: string
  onSuccess: () => void
  onResend: (onSent: () => void) => void
  resendError: string | null
  isResending: boolean
  onBack: () => void
}

function LoginCodeStep({
  email,
  onSuccess,
  onResend,
  resendError,
  isResending,
  onBack,
}: LoginCodeStepProps) {
  const verify = useVerifyLogin()
  const [code, setCode] = useState('')
  const [resent, setResent] = useState(false)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    verify.mutate(code, { onSuccess })
  }

  const resend = () => {
    setResent(false)
    onResend(() => {
      verify.reset()
      setCode('')
      setResent(true)
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <p className="font-medium text-slate-900">새 기기에서 로그인하려면 인증이 필요합니다</p>
        <p className="mt-1 text-sm text-slate-500">
          {email}(으)로 보낸 6자리 인증 코드를 10분 안에 입력하세요.
        </p>
      </div>

      <div>
        <label htmlFor="loginCode" className={labelClass}>
          인증 코드
        </label>
        <input
          id="loginCode"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          className={inputClass}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        {verify.isError && <p className="mt-1.5 text-sm text-red-600">{verify.error.message}</p>}
        {resendError && <p className="mt-1.5 text-sm text-red-600">{resendError}</p>}
        {resent && <p className="mt-1.5 text-sm text-slate-500">새 인증 코드를 보냈습니다.</p>}
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={code.length !== 6 || verify.isPending}
        className="w-full py-3 shadow-lg shadow-brand-600/20"
      >
        {verify.isPending ? '확인 중...' : '확인'}
      </Button>

      <div className="flex justify-between text-sm">
        <button type="button" onClick={onBack} className="text-slate-500 hover:text-slate-700">
          다른 계정으로 로그인
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={isResending}
          className="font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
        >
          {isResending ? '보내는 중...' : '코드 다시 받기'}
        </button>
      </div>
    </form>
  )
}
