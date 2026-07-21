import { Link, useNavigate } from 'react-router-dom'
import { SignupForm } from '@/features/auth'

export default function SignupRoute() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">회원가입</h1>
        <div className="mt-6">
          <SignupForm onSuccess={() => navigate('/login')} />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-medium text-slate-900 underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
