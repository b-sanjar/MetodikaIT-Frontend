import { Outlet } from 'react-router-dom'
import { MonitorPlay } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="app-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 dark:bg-ink">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="animate-glow pointer-events-none absolute -top-40 left-1/2 h-96 w-168 -translate-x-1/2 rounded-full bg-primary-500/25 blur-[130px] dark:bg-primary-500/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 -right-40 h-96 w-96 rounded-full bg-violet-500/15 blur-[110px]"
      />
      <div aria-hidden className="grid-pattern pointer-events-none absolute inset-0 hidden dark:block" />
      <div aria-hidden className="dot-grid pointer-events-none absolute inset-0" />

      {/* Floating decorations */}
      <div aria-hidden className="animate-float pointer-events-none absolute top-[18%] left-[16%] h-3 w-3 rounded-full bg-primary-400/40" />
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute right-[14%] bottom-[22%] h-2.5 w-2.5 rounded-full bg-violet-400/40"
        style={{ animationDelay: '2s' }}
      />

      <div className="animate-rise relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <span className="animate-float relative flex h-14 w-14 items-center justify-center">
            <span
              aria-hidden
              className="animate-spin-slow absolute -inset-2.5 rounded-full bg-conic from-primary-500/50 via-fuchsia-500/10 to-primary-500/50 blur-md"
            />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary-500 to-violet-600 text-white shadow-2xl shadow-primary-500/50 ring-1 ring-white/25 ring-inset">
              <MonitorPlay size={26} />
            </span>
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Maktab IT Metodikasi
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Informatika darslari uchun yagona raqamli makon
            </p>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
