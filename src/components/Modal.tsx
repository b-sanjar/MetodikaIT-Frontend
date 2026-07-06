import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../utils/cn'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

// Rendered through a portal: pages animate with transforms, and a transformed
// ancestor would otherwise become the containing block for position:fixed.
export default function Modal({ open, title, onClose, children, wide = false }: Props) {
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/70"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'animate-pop relative z-10 flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-white/60 bg-white/90 shadow-2xl shadow-primary-900/20 backdrop-blur-2xl dark:border-white/10 dark:bg-surface/95 dark:shadow-black/60',
          'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-primary-400/60 before:to-transparent',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-edge">
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
