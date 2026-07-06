import { initials } from '../utils/format'
import { cn } from '../utils/cn'

const PALETTE = [
  'bg-linear-to-br from-primary-500/25 to-violet-500/30 text-primary-600 ring-primary-500/25 dark:text-primary-300',
  'bg-linear-to-br from-emerald-500/25 to-teal-500/30 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300',
  'bg-linear-to-br from-amber-500/25 to-orange-500/30 text-amber-600 ring-amber-500/25 dark:text-amber-300',
  'bg-linear-to-br from-rose-500/25 to-pink-500/30 text-rose-600 ring-rose-500/25 dark:text-rose-300',
  'bg-linear-to-br from-sky-500/25 to-cyan-500/30 text-sky-600 ring-sky-500/25 dark:text-sky-300',
  'bg-linear-to-br from-violet-500/25 to-fuchsia-500/30 text-violet-600 ring-violet-500/25 dark:text-violet-300',
]

interface Props {
  name: string
  photo?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
}

export default function Avatar({ name, photo, size = 'md', className }: Props) {
  const hue = PALETTE[(name.charCodeAt(0) + name.length) % PALETTE.length]
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={cn(
          'shrink-0 rounded-full object-cover ring-2 ring-primary-500/20',
          sizes[size].split(' text-')[0],
          className,
        )}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset',
        sizes[size],
        hue,
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
