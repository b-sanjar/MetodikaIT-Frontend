import type { LucideIcon } from 'lucide-react'
import Card from './Card'
import { cn } from '../utils/cn'

export type StatTone = 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose'

const TONES: Record<StatTone, { tile: string; value: string; glow: string }> = {
  indigo: {
    tile: 'from-indigo-500 to-violet-500 shadow-indigo-500/40',
    value: 'from-indigo-500 to-violet-500 dark:from-indigo-300 dark:to-violet-300',
    glow: 'bg-indigo-500/15',
  },
  emerald: {
    tile: 'from-emerald-500 to-teal-500 shadow-emerald-500/40',
    value: 'from-emerald-500 to-teal-500 dark:from-emerald-300 dark:to-teal-300',
    glow: 'bg-emerald-500/15',
  },
  amber: {
    tile: 'from-amber-500 to-orange-500 shadow-amber-500/40',
    value: 'from-amber-500 to-orange-500 dark:from-amber-300 dark:to-orange-300',
    glow: 'bg-amber-500/15',
  },
  sky: {
    tile: 'from-sky-500 to-cyan-500 shadow-sky-500/40',
    value: 'from-sky-500 to-cyan-500 dark:from-sky-300 dark:to-cyan-300',
    glow: 'bg-sky-500/15',
  },
  rose: {
    tile: 'from-rose-500 to-pink-500 shadow-rose-500/40',
    value: 'from-rose-500 to-pink-500 dark:from-rose-300 dark:to-pink-300',
    glow: 'bg-rose-500/15',
  },
}

interface Props {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  tone?: StatTone
}

export default function StatCard({ icon: Icon, label, value, hint, tone = 'indigo' }: Props) {
  const t = TONES[tone]
  return (
    <Card hover className="group relative overflow-hidden p-5">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl transition-opacity duration-300 opacity-60 group-hover:opacity-100',
          t.glow,
        )}
      />
      <Icon
        aria-hidden
        size={92}
        className="pointer-events-none absolute -right-3 -bottom-5 text-gray-900 opacity-[0.05] transition-opacity duration-300 group-hover:opacity-10 dark:text-white"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">{label}</p>
          <p
            className={cn(
              'font-display mt-2 bg-linear-to-br bg-clip-text text-3xl font-bold text-transparent',
              t.value,
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
        </div>
        <div
          className={cn(
            'rounded-xl bg-linear-to-br p-2.5 text-white shadow-lg ring-1 ring-white/25 ring-inset transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
            t.tile,
          )}
        >
          <Icon size={20} />
        </div>
      </div>
    </Card>
  )
}
