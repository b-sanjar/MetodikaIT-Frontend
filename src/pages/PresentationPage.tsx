import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Home,
  Maximize,
  Minimize,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as api from '../services/api'
import { QUARTER_NAMES } from '../data/curriculum'
import { useFetch } from '../hooks/useFetch'
import { ErrorState, Spinner } from '../components/States'
import type { Lesson } from '../types'
import { cn } from '../utils/cn'

type SlideKind = 'title' | 'content' | 'closing'

interface Slide {
  kind: SlideKind
  kicker: string
  icon: LucideIcon
  title: string
  paragraphs?: string[]
  bullets?: string[]
  numbered?: boolean
}

function buildSlides(lesson: Lesson): Slide[] {
  return [
    {
      kind: 'title',
      kicker: `${lesson.grade}-sinf · ${QUARTER_NAMES[lesson.quarter - 1]} · ${lesson.order}-dars`,
      icon: BookOpen,
      title: lesson.title,
      paragraphs: ['Informatika va axborot texnologiyalari'],
    },
    {
      kind: 'content',
      kicker: 'Dars maqsadi',
      icon: Target,
      title: 'Bugun nimani o‘rganamiz?',
      paragraphs: [lesson.objective],
    },
    ...lesson.theory.map<Slide>((p, i) => ({
      kind: 'content',
      kicker: `Nazariy qism · ${i + 1}/${lesson.theory.length}`,
      icon: BookOpen,
      title: lesson.title,
      paragraphs: [p],
    })),
    {
      kind: 'content',
      kicker: 'Amaliyot',
      icon: ClipboardCheck,
      title: 'Amaliy topshiriqlar',
      bullets: lesson.practice,
      numbered: true,
    },
    { kind: 'content', kicker: 'Uy vazifasi', icon: Home, title: 'Uyga vazifa', paragraphs: [lesson.homework] },
    { kind: 'content', kicker: 'Yakun', icon: Sparkles, title: 'Kutilgan natijalar', bullets: lesson.outcomes },
    {
      kind: 'closing',
      kicker: lesson.title,
      icon: Sparkles,
      title: 'E’tiboringiz uchun rahmat!',
      paragraphs: ['Savollar bo‘lsa, marhamat 🙂'],
    },
  ]
}

export default function PresentationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: lesson, loading, error, reload } = useFetch(() => api.getLesson(id!), [id])
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  const slides = useMemo(() => (lesson ? buildSlides(lesson) : []), [lesson])
  const total = slides.length

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    navigate(`/dars/${id}`)
  }, [navigate, id])

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.min(Math.max(i + delta, 0), total - 1)),
    [total],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') go(1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1)
      else if (e.key === 'Home') setIndex(0)
      else if (e.key === 'End') setIndex(total - 1)
      else if (e.key === 'Escape') exit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, exit, total])

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <Spinner label="Taqdimot tayyorlanmoqda..." />
      </div>
    )
  if (error || !lesson)
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <ErrorState message={error ?? 'Dars topilmadi'} onRetry={reload} />
      </div>
    )

  const slide = slides[index]
  const Icon = slide.icon

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-ink text-white select-none">
      {/* Layered backdrop: strong aurora glows + grid */}
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -top-48 left-1/4 h-120 w-136 rounded-full bg-primary-500/35 blur-[150px]"
      />
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -bottom-56 -right-32 h-112 w-md rounded-full bg-violet-500/30 blur-[130px]"
        style={{ animationDelay: '-10s', animationDuration: '30s' }}
      />
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute top-1/3 -left-40 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[110px]"
        style={{ animationDelay: '-18s', animationDuration: '22s' }}
      />
      <div
        aria-hidden
        className="animate-glow pointer-events-none absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-sky-500/20 blur-[120px]"
      />
      <div aria-hidden className="grid-pattern pointer-events-none absolute inset-0" />

      {/* Floating particles */}
      {[
        ['top-24', 'right-[12%]', 'h-3 w-3', 'bg-primary-400/60', '0s'],
        ['bottom-32', 'left-[10%]', 'h-2 w-2', 'bg-violet-400/60', '1.6s'],
        ['top-1/2', 'right-[6%]', 'h-2 w-2', 'bg-sky-400/50', '3s'],
        ['top-[30%]', 'left-[6%]', 'h-2.5 w-2.5', 'bg-fuchsia-400/40', '2.2s'],
        ['bottom-[18%]', 'right-[22%]', 'h-1.5 w-1.5', 'bg-amber-300/50', '4s'],
        ['top-[16%]', 'left-[30%]', 'h-1.5 w-1.5', 'bg-primary-300/50', '5s'],
      ].map(([top, side, size, color, delay]) => (
        <div
          key={`${top}-${side}`}
          aria-hidden
          className={`animate-float pointer-events-none absolute ${top} ${side} ${size} rounded-full ${color} shadow-[0_0_12px] shadow-current`}
          style={{ animationDelay: delay }}
        />
      ))}

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <p className="truncate text-xs font-medium tracking-wide text-gray-500 sm:text-sm">
          {lesson.grade}-sinf · {lesson.title}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleFullscreen}
            aria-label="To‘liq ekran"
            className="rounded-lg p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white active:scale-90 cursor-pointer"
          >
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          <button
            onClick={exit}
            aria-label="Taqdimotdan chiqish"
            className="rounded-lg p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white active:scale-90 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Slide body */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 sm:px-16">
        {/* Giant slide-number watermark */}
        <span
          aria-hidden
          className="font-display pointer-events-none absolute right-6 bottom-2 text-[9rem] leading-none font-bold text-white/4 select-none sm:text-[13rem]"
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        <div
          key={index}
          className={cn('animate-slide-in relative w-full max-w-4xl', slide.kind !== 'content' && 'text-center')}
        >
          {/* Sparkle accents around the text block */}
          <span aria-hidden className="animate-sparkle pointer-events-none absolute -top-10 -left-4 text-2xl text-primary-300/80 sm:-left-12">
            ✦
          </span>
          <span
            aria-hidden
            className="animate-sparkle pointer-events-none absolute top-1/3 -right-2 text-lg text-violet-300/70 sm:-right-10"
            style={{ animationDelay: '0.9s' }}
          >
            ✦
          </span>
          <span
            aria-hidden
            className="animate-sparkle pointer-events-none absolute -bottom-8 left-1/4 text-sm text-sky-300/70"
            style={{ animationDelay: '1.7s' }}
          >
            ✦
          </span>

          <span className="relative mb-6 inline-flex items-center gap-2.5 rounded-full bg-primary-500/15 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-primary-300 uppercase ring-1 ring-primary-400/40 ring-inset backdrop-blur sm:text-sm">
            <span className="relative flex h-6 w-6 items-center justify-center">
              <span
                aria-hidden
                className="animate-spin-slow absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, transparent, rgb(129 140 248 / 0.9), transparent 60%)',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
                }}
              />
              <Icon size={13} />
            </span>
            {slide.kicker}
          </span>

          <h1
            className={cn(
              'font-display font-bold tracking-tight text-balance',
              slide.kind === 'title'
                ? 'bg-linear-to-br from-white via-primary-200 to-violet-300 bg-clip-text text-4xl text-transparent drop-shadow-[0_0_30px_rgba(99,102,241,0.35)] sm:text-6xl lg:text-7xl'
                : slide.kind === 'closing'
                  ? 'bg-linear-to-br from-white via-violet-200 to-fuchsia-300 bg-clip-text text-4xl text-transparent drop-shadow-[0_0_30px_rgba(139,92,246,0.35)] sm:text-6xl'
                  : 'text-3xl text-white sm:text-5xl',
            )}
          >
            {slide.title}
          </h1>

          {/* Animated gradient underline */}
          <span
            aria-hidden
            className={cn(
              'animate-grow-line mt-5 block h-1 w-28 rounded-full bg-linear-to-r from-primary-400 via-violet-400 to-fuchsia-400 shadow-[0_0_18px] shadow-primary-500/60',
              slide.kind !== 'content' && 'mx-auto',
            )}
          />

          {slide.paragraphs?.map((p, i) => (
            <p
              key={p}
              className={cn(
                'animate-rise mt-7 text-lg leading-relaxed text-gray-300 sm:text-2xl sm:leading-relaxed',
                slide.kind === 'content' ? 'max-w-3xl' : 'mx-auto max-w-2xl',
              )}
              style={{ animationDelay: `${0.15 + i * 0.1}s` }}
            >
              {p}
            </p>
          ))}

          {slide.bullets && (
            <ul className="mt-9 flex max-w-3xl flex-col gap-4">
              {slide.bullets.map((b, i) => (
                <li
                  key={b}
                  className="animate-rise flex items-start gap-4 rounded-xl bg-white/5 p-4 text-lg text-gray-200 ring-1 ring-white/10 ring-inset backdrop-blur sm:text-xl"
                  style={{ animationDelay: `${0.15 + i * 0.12}s` }}
                >
                  {slide.numbered ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary-500 to-violet-500 text-sm font-bold text-white shadow-lg shadow-primary-500/40">
                      {i + 1}
                    </span>
                  ) : (
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-primary-400 shadow-[0_0_12px] shadow-primary-400" />
                  )}
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Click zones for remote-less navigation */}
        <button aria-label="Oldingi slayd" onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize" />
        <button aria-label="Keyingi slayd" onClick={() => go(1)} className="absolute inset-y-0 right-0 w-1/2 cursor-e-resize" />
      </main>

      {/* Bottom bar */}
      <footer className="relative z-10 flex items-center gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-1">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Oldingi"
            className="rounded-lg p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white active:scale-90 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => go(1)}
            disabled={index === total - 1}
            aria-label="Keyingi"
            className="rounded-lg p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white active:scale-90 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Slide dots */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {slides.map((s, i) => (
            <button
              key={`${s.kicker}-${i}`}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}-slayd`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                i === index
                  ? 'w-6 bg-primary-400 shadow-[0_0_8px] shadow-primary-500/60'
                  : 'w-1.5 bg-white/20 hover:bg-white/40',
              )}
            />
          ))}
        </div>

        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-linear-to-r from-primary-500 to-violet-400 transition-all duration-500"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-gray-400 tabular-nums ring-1 ring-white/10 ring-inset sm:text-sm">
          {index + 1} / {total}
        </span>
      </footer>
    </div>
  )
}
