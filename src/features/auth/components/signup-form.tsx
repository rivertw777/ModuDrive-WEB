import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { CheckIcon } from '@/components/ui/icons'
import { useConfirmEmailVerification } from '../api/confirm-email-verification'
import { useRequestEmailVerification } from '../api/request-email-verification'
import { useSignup } from '../api/signup'

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

export function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const signup = useSignup()
  const requestVerification = useRequestEmailVerification()
  const confirmVerification = useConfirmEmailVerification()
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const [sentToEmail, setSentToEmail] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [resendAt, setResendAt] = useState(0)
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

  const onRequestCode = () => {
    setCode('')
    requestVerification.mutate(email, {
      onSuccess: () => {
        setSentToEmail(email)
        setResendAt(Date.now() + 60_000)
      },
    })
  }

  const onConfirmCode = () => {
    confirmVerification.mutate({ email, code }, { onSuccess: () => setVerifiedEmail(email) })
  }

  const onSubmit = (values: SignupFormValues) => {
    signup.mutate(values, {
      onSuccess,
      // Server-side verification can expire (30min TTL) or get consumed-then-rolled-back
      // between confirming and submitting — reset so the 인증 button reappears instead of
      // leaving a 회원가입 button that can never succeed.
      onError: () => {
        setVerifiedEmail(null)
        setSentToEmail(null)
        setCode('')
      },
    })
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'
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
        <div className="flex items-start gap-2">
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            {...register('email')}
          />
          {isVerified ? (
            <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-brand-600 dark:text-brand-400">
              <CheckIcon size={16} />
              인증 완료
            </span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={!isEmailValid || requestVerification.isPending || Date.now() < resendAt}
              onClick={onRequestCode}
              className="mt-1 shrink-0"
            >
              {requestVerification.isPending ? '발송 중...' : isCodeSent ? '재전송' : '인증'}
            </Button>
          )}
        </div>
        {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}
        {requestVerification.isError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{requestVerification.error.message}</p>
        )}

        {!isVerified && isCodeSent && (
          <div className="mt-2">
            <div className="flex items-start gap-2">
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
                className={inputClass}
              />
              <Button
                type="button"
                variant="primary"
                disabled={code.length !== 6 || confirmVerification.isPending}
                onClick={onConfirmCode}
                className="mt-1 shrink-0"
              >
                {confirmVerification.isPending ? '확인 중...' : '확인'}
              </Button>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              인증 코드가 이메일로 발송되었습니다.
            </p>
            {confirmVerification.isError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{confirmVerification.error.message}</p>
            )}
          </div>
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

      <Button type="submit" variant="primary" disabled={signup.isPending || !isVerified} className="w-full">
        {signup.isPending ? '가입 중...' : '회원가입'}
      </Button>
    </form>
  )
}
