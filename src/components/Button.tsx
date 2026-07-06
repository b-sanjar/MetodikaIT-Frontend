import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../utils/cn'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-linear-to-br from-primary-500 via-primary-600 to-violet-600 text-white shadow-lg shadow-primary-500/35 ring-1 ring-white/25 ring-inset hover:shadow-xl hover:shadow-primary-500/45 hover:brightness-110 active:scale-[0.97]',
  outline:
    'border border-gray-300 bg-white/60 text-gray-700 shadow-sm hover:border-primary-400 hover:text-primary-600 hover:shadow-md hover:shadow-primary-500/10 dark:border-edge dark:bg-white/5 dark:text-gray-300 dark:hover:border-primary-500/60 dark:hover:text-primary-300 active:scale-[0.97]',
  ghost:
    'text-gray-500 hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100',
  danger:
    'bg-red-500/10 text-red-600 ring-1 ring-red-500/20 ring-inset hover:bg-red-500/20 dark:text-red-400 active:scale-[0.97]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-sm gap-2',
}

export default function Button({ variant = 'primary', size = 'md', className, children, ...rest }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
