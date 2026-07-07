import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  src: string
  alt: string
  onClose: () => void
  /** Buttons shown under the image (e.g. replace / delete). */
  actions?: ReactNode
}

// Fullscreen Telegram-style image viewer. Rendered through a portal for the
// same reason as Modal: transformed page ancestors would trap position:fixed.
export default function PhotoViewer({ open, src, alt, onClose, actions }: Props) {
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/85 p-4 backdrop-blur-sm"
    >
      <button
        onClick={onClose}
        aria-label="Yopish"
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white cursor-pointer"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop max-h-[75vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl shadow-black/60"
      />
      {actions && (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>,
    document.body,
  )
}
