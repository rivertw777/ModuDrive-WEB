import { Link, useNavigate } from 'react-router-dom'
import { LoginForm } from '@/features/auth'

export default function LoginRoute() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">로그인</h1>
        <div className="mt-6">
          <LoginForm onSuccess={() => navigate('/drive')} />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="font-medium text-slate-900 underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
