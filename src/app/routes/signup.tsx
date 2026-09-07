import { Link, useNavigate } from 'react-router-dom'
import { SignupForm } from '@/features/auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function SignupRoute() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-900">
      <div className="absolute right-6 top-3">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">회원가입</h1>
        </div>
        <div className="mt-8">
          <SignupForm onSuccess={() => navigate('/login')} />
        </div>
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
