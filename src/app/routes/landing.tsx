import { Link } from 'react-router-dom'

export default function LandingRoute() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-neutral-950">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-bold text-white">
          M
        </span>
        <h1 className="mt-6 text-3xl font-semibold text-slate-900 dark:text-neutral-100">ModuDrive</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-neutral-400">
          파일을 안전하게 저장하고, 어디서나 접근하고, 손쉽게 공유하세요.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            to="/signup"
            className="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            시작하기
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            로그인
          </Link>
        </div>
      </div>
    </div>
  )
}
