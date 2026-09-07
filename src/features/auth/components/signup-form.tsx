import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { CheckIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { useConfirmEmailVerification } from '../api/confirm-email-verification'
import { useRequestEmailVerification } from '../api/request-email-verification'
import { useSignup } from '../api/signup'

// Matches member-service's MEMBER_EMAIL_VERIFICATION_TOKEN_EXPIRATION (180000ms).
const CODE_TTL_MS = 3 * 60_000

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const emailSchema = z.string().min(1, '이메일은 필수입니다').email('유효한 이메일 형식이 아닙니다')

const signupSchema = z
  .object({
    name: z.string().min(1, '이름은 필수입니다'),
    email: emailSchema,
    password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인은 필수입니다'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

type SignupFormValues = z.infer<typeof signupSchema>

function ValidBadge({ label }: { label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white"
    >
      <CheckIcon size={12} />
    </span>
  )
}

const inputClass =
  'mt-1.5 w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-1 ring-inset ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-500 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-white/10'
const labelClass = 'block text-[13px] font-medium text-slate-500 dark:text-slate-400'

export function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const signup = useSignup()
  const requestVerification = useRequestEmailVerification()
  const confirmVerification = useConfirmEmailVerification()
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const [sentToEmail, setSentToEmail] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [codeExpiresAt, setCodeExpiresAt] = useState(0)
  const [now, setNow] = useState(Date.now())
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) })

  const email = watch('email') ?? ''
  const isEmailValid = emailSchema.safeParse(email).success
  const isVerified = verifiedEmail !== null && verifiedEmail === email
  const isCodeSent = sentToEmail !== null && sentToEmail === email
  const remainingMs = codeExpiresAt - now
  const isCodeExpired = isCodeSent && remainingMs <= 0
  const password = watch('password') ?? ''
  const confirmPassword = watch('confirmPassword') ?? ''
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  // Ticks the expiry countdown while a code is outstanding; stops once verified/expired.
  useEffect(() => {
    if (!isCodeSent || isVerified || isCodeExpired) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isCodeSent, isVerified, isCodeExpired])

  const onRequestCode = () => {
    setCode('')
    requestVerification.mutate(email, {
      onSuccess: () => {
        setSentToEmail(email)
        setResendAt(Date.now() + 60_000)
        setCodeExpiresAt(Date.now() + CODE_TTL_MS)
        setNow(Date.now())
      },
    })
  }

  const onConfirmCode = () => {
    confirmVerification.mutate({ email, code }, { onSuccess: () => setVerifiedEmail(email) })
  }

  const onSubmit = (values: SignupFormValues) => {
    signup.mutate(values, {
      onSuccess,
      // Server-side verification can expire (3min TTL) or get consumed-then-rolled-back
      // between confirming and submitting — reset so the 인증 button reappears instead of
      // leaving a 회원가입 button that can never succeed.
      onError: () => {
        setVerifiedEmail(null)
        setSentToEmail(null)
        setCode('')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label htmlFor="name" className={labelClass}>
          이름
        </label>
        <input id="name" type="text" autoComplete="name" className={inputClass} {...register('name')} />
        {errors.name && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          이메일
        </label>
        <div className="flex items-start gap-2">
          <div className="relative flex-1">
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={cn(inputClass, isVerified && 'pr-10')}
              {...register('email')}
            />
            {isVerified && <ValidBadge label="인증 완료" />}
          </div>
          {!isVerified && isEmailValid && (
            <Button
              type="button"
              variant="secondary"
              disabled={requestVerification.isPending || Date.now() < resendAt}
              onClick={onRequestCode}
              className="mt-1.5 w-[4.5rem] shrink-0 whitespace-nowrap border-0 bg-slate-100 px-1.5 py-3 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {requestVerification.isPending ? '발송 중...' : isCodeSent ? '재전송' : '인증'}
            </Button>
          )}
        </div>
        {errors.email && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}
        {requestVerification.isError && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{requestVerification.error.message}</p>
        )}

        {!isVerified && isCodeSent && !isCodeExpired && (
          <div className="mt-3">
            <div className="flex items-start gap-2">
              <div className="relative flex-1">
                <input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  aria-label="인증 코드"
                  placeholder="6자리 인증 코드"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={cn(inputClass, 'mt-0 pr-14')}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium tabular-nums text-slate-400 dark:text-slate-500">
                  {formatRemaining(remainingMs)}
                </span>
              </div>
              <Button
                type="button"
                variant="primary"
                disabled={code.length !== 6 || confirmVerification.isPending}
                onClick={onConfirmCode}
                className="w-[4.5rem] shrink-0 whitespace-nowrap px-1.5 py-3"
              >
                {confirmVerification.isPending ? '확인 중...' : '확인'}
              </Button>
            </div>
            {confirmVerification.isError && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{confirmVerification.error.message}</p>
            )}
          </div>
        )}
        {!isVerified && isCodeExpired && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            인증 코드가 만료되었습니다. 재전송을 눌러주세요.
          </p>
        )}
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
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          비밀번호 확인
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={cn(inputClass, passwordsMatch && !errors.confirmPassword && 'pr-10')}
            {...register('confirmPassword')}
          />
          {passwordsMatch && !errors.confirmPassword && <ValidBadge label="비밀번호 일치" />}
        </div>
        {errors.confirmPassword && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>

      {signup.isError && <p className="text-sm text-red-600 dark:text-red-400">{signup.error.message}</p>}

      <Button
        type="submit"
        variant="primary"
        disabled={signup.isPending || !isVerified}
        className="w-full py-3 shadow-lg shadow-brand-600/20"
      >
        {signup.isPending ? '가입 중...' : '회원가입'}
      </Button>
    </form>
  )
}
