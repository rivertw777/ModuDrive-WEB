import { Link, useNavigate } from 'react-router-dom'
import { SignupForm } from '@/features/auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function SignupRoute() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-900">
      <div className="absolute left-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col items-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-violet-600 text-lg font-bold text-white">
            M
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">회원가입</h1>
        </div>
        <div className="mt-6">
          <SignupForm onSuccess={() => navigate('/login')} />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
