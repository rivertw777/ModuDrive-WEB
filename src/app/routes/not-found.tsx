import { Link } from 'react-router-dom'

export default function NotFoundRoute() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">페이지를 찾을 수 없습니다</h1>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-slate-900 underline">
          홈으로 이동
        </Link>
      </div>
    </div>
  )
}
