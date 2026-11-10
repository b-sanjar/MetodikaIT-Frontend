import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../utils/cn'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full'

interface Props {
  open: boolean
  title?: string
  subtitle?: string
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
  wide?: boolean
  size?: ModalSize
  className?: string
  bodyClassName?: string
}

const SIZE_MAP: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',      // ~448px (tasdiqlash, qisqa xabarlar)
  md: 'sm:max-w-lg',      // ~512px (standart formalar)
  lg: 'sm:max-w-2xl',     // ~672px (kattaroq formalar)
  xl: 'sm:max-w-3xl',     // ~768px (dars qo‘shish, mavzular tanlash)
  '2xl': 'sm:max-w-5xl',  // ~1024px (keng profillar, jadvallar)
  '3xl': 'sm:max-w-6xl',  // ~1152px (to‘liq o‘quvchi profili va statistika)
  '4xl': 'sm:max-w-7xl',  // ~1280px (juda katta ekranlar)
  full: 'sm:max-w-[95vw]',
}

// Rendered through a portal: pages animate with transforms, and a transformed
// ancestor would otherwise become the containing block for position:fixed.
export default function Modal({
  open,
  title,
  subtitle,
  icon,
  onClose,
  children,
  wide = false,
  size,
  className,
  bodyClassName,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  // Determine size: explicit size > wide ? 'xl' : 'md'
  const resolvedSize = size ? SIZE_MAP[size] : wide ? SIZE_MAP.xl : SIZE_MAP.md

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="animate-in fade-in duration-200 absolute inset-0 bg-black/60 backdrop-blur-md dark:bg-black/80"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Modal darcha'}
        className={cn(
          'animate-pop relative z-10 flex max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl shadow-primary-950/25 backdrop-blur-2xl dark:border-edge dark:bg-surface/98 dark:shadow-black/70',
          'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-linear-to-r before:from-primary-500 before:via-violet-500 before:to-fuchsia-500',
          resolvedSize,
          className,
        )}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-4.5 dark:border-edge dark:bg-surface-2/60">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300">
                  {icon}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-gray-900 truncate dark:text-white">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Yopish"
              className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={cn('overflow-y-auto p-5 sm:p-7', bodyClassName)}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
