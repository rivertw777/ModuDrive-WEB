import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LoginForm } from '@/features/auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function LoginRoute() {
  const navigate = useNavigate()
  // Set by AppLayoutRoute's redirect-to-login when an unauthenticated visit hit a
  // protected deep link (e.g. a shared file's /files/:fileId link).
  const from = (useLocation().state as { from?: string } | null)?.from

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-900">
      <div className="absolute right-6 top-3">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">로그인</h1>
        </div>
        <div className="mt-8">
          <LoginForm onSuccess={() => navigate(from ?? '/drive', { replace: true })} />
        </div>
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
