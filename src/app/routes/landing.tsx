import { Link } from 'react-router-dom'

// Keyframes/classes below back the decorative hero (gradient stage, perspective floor,
// glass step blocks) — scoped here since only this page uses them.
const heroStyles = `
  .hero-stage-bg {
    background: linear-gradient(180deg, #FFFFFF 0%, #FFF6EE 22%, #FCE3D2 44%, #E3C7DF 68%, #B59CD0 88%, #8E6AB8 100%);
    position: relative;
    overflow: hidden;
  }
  .radiant-glow-sphere {
    position: absolute;
    top: 18%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 900px;
    height: 520px;
    background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(255, 231, 214, 0.75) 45%, rgba(248, 196, 168, 0.25) 70%, transparent 85%);
    filter: blur(40px);
    pointer-events: none;
    z-index: 1;
  }
  .stage-perspective-wrap {
    perspective: 900px;
    perspective-origin: 50% 28%;
    transform-style: preserve-3d;
  }
  .perspective-grid-plane {
    transform: rotateX(63deg) translateZ(-40px);
    background-image:
      linear-gradient(to right, rgba(168, 85, 247, 0.22) 1.5px, transparent 1.5px),
      linear-gradient(to bottom, rgba(168, 85, 247, 0.22) 1.5px, transparent 1.5px);
    background-size: 58px 58px;
    mask-image: linear-gradient(to top, rgba(0,0,0,1) 30%, rgba(0,0,0,0.6) 75%, transparent 100%);
    -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 30%, rgba(0,0,0,0.6) 75%, transparent 100%);
  }
  .glass-step-block {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(243, 232, 255, 0.45) 50%, rgba(192, 132, 252, 0.35) 100%);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.75);
    border-bottom: 2px solid rgba(147, 51, 234, 0.4);
    box-shadow: 0 18px 25px -8px rgba(107, 33, 168, 0.35), inset 0 1.5px 2px rgba(255, 255, 255, 0.9), inset 0 -1.5px 3px rgba(168, 85, 247, 0.3);
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .glass-step-block:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 26px 36px -10px rgba(107, 33, 168, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.95);
    border-color: rgba(255, 255, 255, 0.95);
  }
`

export default function LandingRoute() {
  return (
    <div className="hero-stage-bg flex min-h-screen flex-col justify-between overflow-x-hidden text-slate-900 antialiased selection:bg-purple-300 selection:text-purple-950">
      <style>{heroStyles}</style>
      <div aria-hidden="true" className="radiant-glow-sphere" />

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

      {/* Perspective floor + floating glass blocks */}
      <section
        aria-label="Interactive 3D Storage Visualization"
        className="relative mt-auto w-full select-none overflow-hidden pb-0 pt-4"
        style={{ minHeight: 200 }}
      >
        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-end pb-8">
          <div className="relative -mb-10 flex w-full items-center justify-center px-4">
            <div className="absolute left-[26%] -top-40 hidden lg:flex">
              <div className="flex h-14 w-14 rotate-[6deg] transform items-center justify-center rounded-2xl text-purple-800 glass-step-block">
                <svg
                  className="h-6 w-6 text-purple-900"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <rect height="16" rx="2" width="20" x="2" y="4" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="stage-perspective-wrap pointer-events-none absolute inset-x-0 bottom-0 top-0 z-0">
          <div className="perspective-grid-plane absolute inset-x-[-30%] bottom-[-80px] h-[550px] w-[160%]" />
          <div className="absolute bottom-0 left-[-20px] h-64 w-72 rounded-tr-3xl border-r border-t border-white/30 bg-gradient-to-tr from-purple-900/40 to-transparent opacity-70 backdrop-blur-sm" />
          <div className="absolute bottom-0 right-[-20px] h-64 w-72 rounded-tl-3xl border-l border-t border-white/30 bg-gradient-to-tl from-purple-900/40 to-transparent opacity-70 backdrop-blur-sm" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-[#825AA9]/70 via-[#A47FBF]/30 to-transparent" />
      </section>

      {/* Footer */}
      <footer className="relative z-30 flex w-full flex-col items-center justify-center gap-2 border-t border-purple-300/40 bg-purple-950/20 px-6 py-4 text-xs text-purple-950/80 backdrop-blur-xl sm:flex-row sm:justify-between lg:px-14">
        <span>© 2026 ModuDrive Technologies Inc. All rights reserved.</span>
        <div className="flex items-center space-x-6 font-medium">
          <a className="transition-colors hover:text-purple-950" href="#">
            개인정보처리방침
          </a>
          <a className="transition-colors hover:text-purple-950" href="#">
            서비스 이용약관
          </a>
        </div>
      </footer>
    </div>
  )
}
