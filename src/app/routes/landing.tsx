import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function LandingRoute() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-slate-900">
      <div className="absolute left-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center text-center">
        <img src="/logo.png" alt="ModuDrive" className="size-14" />
        <h1 className="font-brand mt-6 text-5xl font-extrabold text-[#1C3D5A] dark:text-[#F5F3EE]">
          ModuDrive
        </h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
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
            className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            로그인
          </Link>
        </div>
      </div>
    </div>
  )
}
