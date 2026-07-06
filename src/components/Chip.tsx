import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

type Tone = 'primary' | 'green' | 'amber' | 'red' | 'gray'

const tones: Record<Tone, string> = {
  primary:
    'bg-primary-500/10 text-primary-600 ring-primary-500/25 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-400/25',
  green:
    'bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25',
  amber:
    'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25',
  red: 'bg-red-500/10 text-red-600 ring-red-500/25 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/25',
  gray: 'bg-gray-500/10 text-gray-600 ring-gray-500/20 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-gray-400/20',
}

interface Props {
  tone?: Tone
  /** Status ko‘rinishi: chap tomonda pulsli nuqta */
  dot?: boolean
  children: ReactNode
  className?: string
  title?: string
}

export default function Chip({ tone = 'gray', dot = false, children, className, title }: Props) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="animate-glow h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
