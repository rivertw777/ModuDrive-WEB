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
      <div className="absolute left-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col items-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            M
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">로그인</h1>
        </div>
        <div className="mt-6">
          <LoginForm onSuccess={() => navigate(from ?? '/drive', { replace: true })} />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
