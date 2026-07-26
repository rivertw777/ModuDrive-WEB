import { Link, useNavigate } from 'react-router-dom'
import { SignupForm } from '@/features/auth'

export default function SignupRoute() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col items-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            M
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-neutral-100">회원가입</h1>
        </div>
        <div className="mt-6">
          <SignupForm onSuccess={() => navigate('/login')} />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-neutral-400">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
