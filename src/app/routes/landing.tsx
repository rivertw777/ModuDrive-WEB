import { Link } from 'react-router-dom'

export default function LandingRoute() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">ModuDrive</h1>
        <p className="mt-2 text-sm text-slate-500">app shell is wired up — screens land here next.</p>
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <Link to="/login" className="font-medium text-slate-900 underline">
            로그인
          </Link>
          <Link to="/signup" className="font-medium text-slate-900 underline">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  )
}
