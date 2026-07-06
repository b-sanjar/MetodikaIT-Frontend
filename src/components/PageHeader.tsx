import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="hidden w-1.5 self-stretch rounded-full bg-linear-to-b from-primary-500 via-violet-500 to-fuchsia-500 shadow-[0_0_12px] shadow-primary-500/40 sm:block"
        />
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
