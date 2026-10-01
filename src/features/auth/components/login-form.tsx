import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { useLogin, useSendLoginCode, useVerifyLogin } from '../api/login'
import { formatRemaining } from '../utils/format-remaining'

// Matches auth-service's RedisLoginChallengeStore.TTL (5 min) — the code lives as long as the login
// waiting for it, so once it runs out the member logs in again rather than resending.
const CODE_TTL_MS = 5 * 60_000

/** auth-service answers 410 once the wrong codes are used up — a resend gives a fresh code. */
const isCodeEnded = (error: Error | null): error is Error =>
  (error as (Error & { status?: number }) | null)?.status === 410

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
  // Set once the password matched on a device this account hasn't verified: the member asks for
  // the emailed code next (API spec 004 2-2).
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: (result) => (result?.verificationRequired ? setPendingEmail(values.email) : onSuccess()),
    })
  }

  if (pendingEmail) {
    return (
      <LoginCodeStep
        email={pendingEmail}
        onSuccess={onSuccess}
        onBack={() => {
          login.reset()
          setPendingEmail(null)
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
  onBack: () => void
}

/** Same layout as the signup form's email check: the member sends the code, then types it in. */
function LoginCodeStep({ email, onSuccess, onBack }: LoginCodeStepProps) {
  const sendCode = useSendLoginCode()
  const verify = useVerifyLogin()
  const [code, setCode] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [expiresAt, setExpiresAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const remainingMs = expiresAt - now
  const isCodeExpired = isCodeSent && remainingMs <= 0
  const isCodeCountingDown = isCodeSent && !isCodeExpired

  // Ticks the code countdown; stops once it runs out.
  useEffect(() => {
    if (!isCodeCountingDown) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isCodeCountingDown])

  const onSendCode = () => {
    setCode('')
    verify.reset()
    sendCode.mutate(undefined, {
      onSuccess: () => {
        setIsCodeSent(true)
        setExpiresAt(Date.now() + CODE_TTL_MS)
        setNow(Date.now())
      },
    })
  }

  const onConfirmCode = () => {
    verify.mutate(code, {
      onSuccess,
      // 410: out of attempts — end the countdown so the form asks for a
      // new code instead of more guesses, as the signup form does.
      onError: (error) => {
        if (!isCodeEnded(error)) return
        setExpiresAt(Date.now())
        setNow(Date.now())
      },
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-medium text-slate-900">이 기기에서 로그인하려면 인증이 필요합니다</p>
        <p className="mt-1 text-sm text-slate-500">가입하신 이메일로 인증 코드를 받아 인증해 주세요.</p>
      </div>

      <div>
        <label htmlFor="loginEmail" className={labelClass}>
          이메일
        </label>
        <div className="flex items-start gap-2">
          <input
            id="loginEmail"
            type="email"
            readOnly
            value={email}
            className={cn(inputClass, 'flex-1 text-slate-500 focus:bg-slate-100 focus:ring-0')}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={sendCode.isPending}
            onClick={onSendCode}
            className="mt-1.5 w-[4.5rem] shrink-0 whitespace-nowrap border-0 bg-slate-100 px-1.5 py-3 text-slate-700 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100"
          >
            {sendCode.isPending ? '발송 중...' : isCodeSent ? '재전송' : '인증'}
          </Button>
        </div>
        {sendCode.isError && <p className="mt-1.5 text-sm text-red-600">{sendCode.error.message}</p>}

        {isCodeCountingDown && (
          <div className="mt-3">
            <div className="flex items-start gap-2">
              <div className="relative flex-1">
                <input
                  id="loginCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  aria-label="인증 코드"
                  placeholder="6자리 인증 코드"
                  className={cn(inputClass, 'mt-0 pr-14')}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium tabular-nums text-slate-400">
                  {formatRemaining(remainingMs)}
                </span>
              </div>
              <Button
                type="button"
                variant="primary"
                disabled={code.length !== 6 || verify.isPending}
                onClick={onConfirmCode}
                className="w-[4.5rem] shrink-0 whitespace-nowrap px-1.5 py-3 disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-100"
              >
                {verify.isPending ? '확인 중...' : '확인'}
              </Button>
            </div>
            {verify.isError && <p className="mt-1.5 text-sm text-red-600">{verify.error.message}</p>}
          </div>
        )}
        {isCodeExpired && (
          <p className="mt-2 text-sm text-red-600">
            {isCodeEnded(verify.error)
              ? verify.error.message
              : '인증 시간이 지났습니다. 다시 로그인해 주세요.'}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={onBack}
        className="w-full border-0 bg-slate-100 py-3 text-slate-700 hover:bg-slate-200"
      >
        다른 계정으로 로그인
      </Button>
    </div>
  )
}
