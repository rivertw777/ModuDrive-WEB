import { Link } from 'react-router-dom'

export function MarketingHeader() {
  return (
    <header className="relative z-30 flex w-full items-center justify-between px-6 py-5 lg:px-14">
      <Link to="/" className="flex items-center space-x-2.5 focus:outline-none">
        <img src="/logo.svg" alt="ModuDrive" className="size-8 rounded-xl shadow-md" />
        <span className="font-brand text-2xl font-extrabold tracking-tight text-slate-900">
          ModuDrive
        </span>
      </Link>

      <div className="flex items-center space-x-4">
        <Link
          to="/login"
          className="px-3 py-2 text-[15px] font-medium text-slate-700 transition-colors duration-150 hover:text-slate-950"
        >
          로그인
        </Link>
        <Link
          to="/signup"
          className="px-3 py-2 text-[15px] font-medium text-slate-700 transition-colors duration-150 hover:text-slate-950"
        >
          회원가입
        </Link>
      </div>
    </header>
  )
}
