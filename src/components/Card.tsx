import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../utils/cn'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
}

// Frosted-glass surface: translucent fill + blur over the aurora background,
// with a bright top edge for the "liquid" catch-light.
export default function Card({ children, className, hover = false, ...rest }: Props) {
  return (
    <div
      className={cn(
        'relative rounded-xl border border-white/60 bg-white/65 shadow-(--shadow-card) backdrop-blur-xl',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-xl before:bg-linear-to-r before:from-transparent before:via-white/80 before:to-transparent',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:bg-[linear-gradient(135deg,rgb(255_255_255/0.35),transparent_30%)]',
        'dark:border-white/10 dark:bg-surface/60 dark:shadow-none dark:before:via-white/20 dark:after:bg-[linear-gradient(135deg,rgb(255_255_255/0.05),transparent_30%)]',
        hover &&
          'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300/80 hover:bg-white/80 hover:shadow-(--shadow-card-hover) dark:hover:border-primary-500/40 dark:hover:bg-surface/80 dark:hover:shadow-xl dark:hover:shadow-primary-500/10',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
