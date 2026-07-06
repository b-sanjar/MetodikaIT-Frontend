import type { ReactNode } from 'react'
import { CircleAlert, Inbox } from 'lucide-react'
import Button from './Button'

export function Spinner({ label = 'Yuklanmoqda...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400 dark:text-gray-500">
      <span className="relative h-10 w-10">
        <span className="absolute inset-0 rounded-full border-2 border-primary-500/15" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary-500 border-r-violet-500" />
        <span className="absolute inset-2.5 rounded-full bg-primary-500/10 blur-[2px]" />
      </span>
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-red-500/10 p-3 text-red-500">
        <CircleAlert size={24} />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Qayta urinish
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-gray-500/10 p-3 text-gray-400">
        <Inbox size={24} />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {hint && <p className="max-w-sm text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {action}
    </div>
  )
}
