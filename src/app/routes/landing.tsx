import { Link } from 'react-router-dom'

export default function LandingRoute() {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden text-slate-900 antialiased selection:bg-purple-300 selection:text-purple-950">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-[url('/hero-bg.png')] bg-cover bg-bottom"
      />

      {/* Top navigation */}
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

      {/* Hero */}
      <main className="relative z-20 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-start px-4 pb-2 pt-24 text-center sm:px-6">
        <h1 className="mb-6 max-w-4xl text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-950 sm:text-6xl sm:leading-[1.14] md:text-[68px]">
          내 파일을 위한,
          <br className="hidden sm:block" />
          가장 편리한 드라이브
        </h1>
        <p className="mb-8 max-w-2xl text-base font-normal leading-relaxed text-slate-700/90 sm:text-lg md:text-xl">
          ModuDrive에서 언제 어디서나 간편하게,
          <br className="hidden sm:block" />
          소중한 파일을 안전하게 관리하고 자유롭게 공유하세요.
        </p>

        <div className="mb-6 flex w-full flex-col items-center justify-center gap-3.5 sm:w-auto sm:flex-row sm:gap-4">
          <Link
            to="/signup"
            className="w-full rounded-xl bg-gradient-to-b from-slate-600 to-slate-800 px-9 py-4 text-center text-base font-semibold tracking-tight text-white shadow-[0_8px_20px_-6px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-black/10 transition-transform duration-200 active:scale-95 sm:w-auto"
          >
            지금 무료로 시작하기
          </Link>
        </div>
      </main>
    </div>
  )
}
