import { useId, useMemo, useRef, useState, useEffect } from 'react'
import { Check, ChevronDown, FileText, Plus, Search, X } from 'lucide-react'
import type { Lesson } from '../types'
import { cn } from '../utils/cn'

interface Props {
  lessons: Lesson[]
  value: string
  onChange: (lessonId: string) => void
  onCustomTopic?: (title: string) => void
  placeholder?: string
  className?: string
}

export default function TopicCombobox({
  lessons,
  value,
  onChange,
  onCustomTopic,
  placeholder = 'Mavzuni qidirish yoki tanlash...',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const selectedLesson = useMemo(() => lessons.find((l) => l.id === value), [lessons, value])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return lessons
    return lessons.filter((l) => {
      const titleMatch = l.title.toLowerCase().includes(q)
      const orderMatch = `${l.order}`.includes(q) || `${l.order}-dars`.includes(q)
      const typeMatch = l.lessonType ? l.lessonType.toLowerCase().includes(q) : false
      const isControl =
        l.lessonType === 'control' ||
        l.title.toLowerCase().includes('nazorat') ||
        l.title.toLowerCase().includes('oraliq') ||
        l.title.toLowerCase().includes('bsb') ||
        l.title.toLowerCase().includes('chsb')
      const controlMatch = isControl && (q.includes('nazorat') || q.includes('oraliq') || q.includes('bsb') || q.includes('chsb'))
      return titleMatch || orderMatch || typeMatch || controlMatch
    })
  }, [lessons, search])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (id: string) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-amber-200/80 px-0.5 text-gray-900 dark:bg-amber-500/30 dark:text-amber-200">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Selected Topic Trigger / Search Box */}
      <div
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2 text-sm transition-all cursor-pointer dark:bg-surface-2',
          open
            ? 'border-primary-500 ring-2 ring-primary-500/20 dark:border-primary-400'
            : 'border-gray-200 hover:border-gray-300 dark:border-edge dark:hover:border-gray-600',
        )}
      >
        {selectedLesson ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                'shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums',
                selectedLesson.lessonType === 'control'
                  ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                  : 'bg-primary-500/10 text-primary-600 dark:text-primary-300',
              )}
            >
              {selectedLesson.order}-dars
            </span>
            <span className="truncate font-medium text-gray-900 dark:text-white">
              {selectedLesson.title}
            </span>
            {selectedLesson.lessonType === 'control' && (
              <span className="shrink-0 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-300">
                Oraliq nazorat
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {selectedLesson && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setSearch('')
              }}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-surface-3"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={cn('text-gray-400 transition-transform duration-200', open && 'rotate-180')}
          />
        </div>
      </div>

      {/* Dropdown with live search & list */}
      {open && (
        <div className="absolute top-full z-50 mt-1.5 w-full rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl backdrop-blur-xl dark:border-edge dark:bg-surface-2 animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="relative mb-2">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mavzuni qidiring (masalan: 3, algoritm, nazorat)..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2 pr-8 pl-9 text-xs text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:bg-white focus:outline-hidden dark:border-edge dark:bg-surface-3 dark:text-white dark:focus:border-primary-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Filter Badges */}
          <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-gray-400">
            <span>{filtered.length} ta dars mavzusi</span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-primary-500 hover:underline cursor-pointer"
              >
                Tozalash
              </button>
            )}
          </div>

          {/* List of lessons */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                <FileText size={20} className="mx-auto mb-1.5 opacity-40" />
                Mos dars mavzusi topilmadi
                {onCustomTopic && (
                  <div className="mt-3 px-2">
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Yangi maxsus dars mavzusi..."
                      className="w-full rounded-lg border border-dashed border-gray-300 p-2 text-xs dark:border-edge"
                    />
                    {customTitle.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          onCustomTopic(customTitle.trim())
                          setOpen(false)
                        }}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-1.5 text-xs font-semibold text-white hover:bg-primary-600"
                      >
                        <Plus size={14} /> Shu mavzuni kiritish
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              filtered.map((l) => {
                const isSelected = l.id === value
                const isControl =
                  l.lessonType === 'control' ||
                  l.title.toLowerCase().includes('nazorat') ||
                  l.title.toLowerCase().includes('oraliq') ||
                  l.title.toLowerCase().includes('bsb') ||
                  l.title.toLowerCase().includes('chsb')

                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelect(l.id)}
                    className={cn(
                      'group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-primary-500/10 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-surface-3',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                          isControl
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-surface dark:text-gray-400 group-hover:bg-white',
                        )}
                      >
                        {l.order}
                      </span>
                      <span className="truncate">{highlightMatch(l.title, search)}</span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {isControl && (
                        <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-300">
                          Oraliq nazorat
                        </span>
                      )}
                      {isSelected && <Check size={15} className="text-primary-600 dark:text-primary-400" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
