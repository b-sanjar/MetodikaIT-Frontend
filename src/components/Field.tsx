import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

const inputBase =
  'h-10 w-full rounded-lg border border-gray-200 bg-white/80 px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:shadow-lg focus:shadow-primary-500/10 dark:border-edge dark:bg-surface-2 dark:text-gray-100 dark:placeholder:text-gray-500'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </label>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, 'h-auto min-h-24 resize-y py-2 leading-relaxed', className)} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, 'cursor-pointer', className)} {...rest}>
      {children}
    </select>
  )
}
