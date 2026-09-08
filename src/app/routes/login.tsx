import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LoginForm } from '@/features/auth'
import { useForceLightMode } from '@/hooks/use-force-light-mode'
import { MarketingHeader } from '@/components/ui/marketing-header'

export default function LoginRoute() {
  useForceLightMode()
  const navigate = useNavigate()
  // Set by AppLayoutRoute's redirect-to-login when an unauthenticated visit hit a
  // protected deep link (e.g. a shared file's /files/:fileId link).
  const from = (useLocation().state as { from?: string } | null)?.from

  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-[url('/hero-bg.png')] bg-cover bg-bottom"
      />
      <MarketingHeader />
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-900/5">
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">로그인</h1>
          </div>
          <div className="mt-8">
            <LoginForm onSuccess={() => navigate(from ?? '/drive', { replace: true })} />
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="font-medium text-brand-600 hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
