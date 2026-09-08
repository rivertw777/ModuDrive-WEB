import { Link, useNavigate } from 'react-router-dom'
import { SignupForm } from '@/features/auth'
import { useForceLightMode } from '@/hooks/use-force-light-mode'
import { MarketingHeader } from '@/components/ui/marketing-header'

export default function SignupRoute() {
  useForceLightMode()
  const navigate = useNavigate()

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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">회원가입</h1>
          </div>
          <div className="mt-8">
            <SignupForm onSuccess={() => navigate('/login')} />
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
