import { useMemo, useState } from 'react'
import {
  ArrowRightLeft,
  Award,
  BookOpen,
  CalendarCheck,
  Check,
  Copy,
  Flame,
  GraduationCap,
  History,
  Link2,
  Lock,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import * as api from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { useCountUp } from '../hooks/useCountUp'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import Button from './Button'
import Modal from './Modal'
import { ErrorState, Spinner } from './States'
import StudentQuarterChart from './StudentQuarterChart'
import {
  computeStats,
  evaluateAchievements,
  rankProgress,
  starsFor,
} from '../utils/gamification'
import { cn } from '../utils/cn'
import { formatDateShort } from '../utils/format'
import type { BadgeDef, ClassGroup, Student } from '../types'

interface Props {
  student: Student | null
  /** 1-based leaderboard position, 0 when unknown. */
  position: number
  classLabel: string
  badgeDefs: BadgeDef[]
  onClose: () => void
  onStudentUpdated?: (updated: Student) => void
}

/**
 * Game-style student profile: rank hero, animated points counter, progress
 * to the next rank, points timeline, journal stats and an achievements board.
 * Journal and points history come from the per-student endpoints.
 */
export default function StudentProfileModal({
  student,
  position,
  classLabel,
  badgeDefs,
  onClose,
  onStudentUpdated,
}: Props) {
  const { user, isAdmin } = useAuth()
  const [currentStudent, setCurrentStudent] = useState<Student | null>(student)
  const [transferOpen, setTransferOpen] = useState(false)
  const [allClasses, setAllClasses] = useState<ClassGroup[]>([])
  const [selectedNewClassId, setSelectedNewClassId] = useState(student?.classId || '')
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferSuccess, setTransferSuccess] = useState(false)

  const activeStudent = currentStudent || student

  const { data, loading, error, reload } = useFetch(
    () =>
      activeStudent
        ? Promise.all([api.getStudentJournal(activeStudent.id), api.getPointsHistory(activeStudent.id)])
        : Promise.resolve(null),
    [activeStudent?.id],
  )

  const points = useCountUp(activeStudent?.points ?? 0)
  const [copiedPin, setCopiedPin] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const stats = useMemo(() => computeStats(data?.[0] ?? []), [data])
  const history = data?.[1] ?? []

  if (!activeStudent) return null

  const { rank, next, pct, remaining } = rankProgress(activeStudent.points)
  const achievements = evaluateAchievements(activeStudent, stats, position)
  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const ownBadges = (activeStudent.badges || [])
    .map((id) => badgeDefs.find((d) => d.id === id))
    .filter((d): d is BadgeDef => Boolean(d))
  const RankIcon = rank.icon

  const handleTransfer = async () => {
    if (!activeStudent || !selectedNewClassId || selectedNewClassId === activeStudent.classId) return
    setTransferring(true)
    setTransferError(null)
    try {
      const updated = await api.saveStudent({
        id: activeStudent.id,
        name: activeStudent.name,
        classId: selectedNewClassId,
        points: activeStudent.points,
        badges: activeStudent.badges,
      })
      setCurrentStudent(updated)
      onStudentUpdated?.(updated)
      setTransferSuccess(true)
      setTimeout(() => {
        setTransferOpen(false)
        setTransferSuccess(false)
      }, 1000)
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Sinfni ko‘chirishda xatolik yuz berdi')
    } finally {
      setTransferring(false)
    }
  }

  const assignedClass = allClasses.find((c) => c.id === activeStudent.classId)
  const classDisplay = assignedClass
    ? `${assignedClass.grade}-«${assignedClass.letter}» sinf`
    : `${classLabel} sinf`

  return (
    <Modal
      open
      title={activeStudent.name}
      subtitle={`${classDisplay} o‘quvchisi · Shaxsiy reyting va akademik rivojlanish`}
      icon={<GraduationCap size={22} />}
      onClose={onClose}
      size="3xl"
    >
      <div className="flex flex-col gap-6">
        {/* TOP SECTION: 2-COLUMN DASHBOARD (Hero Card on left, Key Metrics & Chart on right) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* LEFT COLUMN: HERO RANK & IDENTITY CARD */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div
              className={cn(
                'relative overflow-hidden rounded-2xl border bg-linear-to-b to-transparent p-6 text-center shadow-sm',
                rank.hero,
              )}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className={cn('absolute -top-16 left-1/2 h-36 w-72 -translate-x-1/2 rounded-full blur-3xl', rank.glow)} />
                <span className="animate-shine absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent dark:via-white/10" />
                <Sparkles size={16} className={cn('animate-sparkle absolute top-5 left-6', rank.text)} />
                <Sparkles size={12} className={cn('animate-sparkle absolute top-12 right-10', rank.text)} style={{ animationDelay: '0.9s' }} />
                <Sparkles size={14} className={cn('animate-sparkle absolute bottom-8 left-12', rank.text)} style={{ animationDelay: '1.7s' }} />
              </div>

              {position > 0 && (
                <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-gray-800 shadow-sm dark:bg-black/40 dark:text-gray-100">
                  <Trophy size={13} className="text-amber-500" />
                  <span>#{position}-o‘rin</span>
                </div>
              )}

              {/* Avatar with floating rank emblem */}
              <div className="relative mx-auto w-fit mt-3">
                <Avatar name={activeStudent.name} size="xl" className="animate-pop ring-4 ring-white/60 dark:ring-white/10 shadow-lg" />
                <span
                  className={cn(
                    'absolute -right-2 -bottom-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white shadow-md dark:border-edge dark:bg-surface-2',
                    rank.text,
                  )}
                  title={`Unvon: ${rank.name}`}
                >
                  <RankIcon size={20} className="animate-float" />
                </span>
              </div>

              <h3 className="font-display mt-3.5 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {activeStudent.name}
              </h3>

              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center rounded-lg border border-gray-200/80 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800 dark:border-edge dark:bg-surface-3 dark:text-gray-200">
                  {classDisplay}
                </span>

                {(isAdmin || user?.role === 'teacher') && (
                  <button
                    type="button"
                    onClick={async () => {
                      setTransferOpen(true)
                      setTransferError(null)
                      if (allClasses.length === 0) {
                        const list = await api.getClasses().catch(() => [])
                        setAllClasses(list)
                      }
                      setSelectedNewClassId(activeStudent.classId)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-500/30 dark:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-500/25 cursor-pointer shadow-xs"
                    title="O‘quvchini boshqa sinfga ko‘chirish"
                  >
                    <ArrowRightLeft size={12} />
                    <span>Sinfni ko‘chirish</span>
                  </button>
                )}
              </div>

              {/* Quick Parent Portal Credentials (PIN & Direct Link) */}
              {activeStudent.code && (
                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeStudent.code || '')
                      setCopiedPin(true)
                      setTimeout(() => setCopiedPin(false), 2000)
                    }}
                    title="Ota-ona kirish kodini nusxalash"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-xs',
                      copiedPin
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary-400 hover:text-primary-600 dark:border-edge dark:bg-surface-3 dark:text-gray-200 dark:hover:border-primary-500 dark:hover:bg-surface-2',
                    )}
                  >
                    {copiedPin ? (
                      <>
                        <Check size={14} className="text-emerald-500" />
                        <span>Nusxalandi!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-gray-400 dark:text-gray-300" />
                        <span>PIN: {activeStudent.code}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/parents?code=${activeStudent.code}`
                      navigator.clipboard.writeText(url)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }}
                    title="Ota-ona portali to‘g‘ridan-to‘g‘ri havolasini nusxalash"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs',
                      copiedLink
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary-400 hover:text-primary-600 dark:border-edge dark:bg-surface-3 dark:text-gray-200 dark:hover:border-primary-500 dark:hover:bg-surface-2',
                    )}
                  >
                    {copiedLink ? (
                      <>
                        <Check size={14} className="text-emerald-500" />
                        <span>Havola olindi!</span>
                      </>
                    ) : (
                      <>
                        <Link2 size={13} className="text-gray-400 dark:text-gray-300" />
                        <span>Portal havolasi</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Points & Stars Hero Section */}
              <div className="mt-4 pt-3.5 border-t border-black/5 dark:border-white/5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ring-1 ring-inset',
                    rank.chip,
                  )}
                >
                  <RankIcon size={13} /> {rank.name}
                </span>

                <div className="mt-2.5 flex items-baseline justify-center gap-1.5">
                  <span className="font-display text-4xl sm:text-5xl font-black text-gray-900 tabular-nums dark:text-white">
                    {points}
                  </span>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">ball</span>
                </div>

                <div className="mt-2 flex items-center justify-center gap-1">
                  {Array.from({ length: starsFor(activeStudent.points) }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="animate-pop fill-amber-400 text-amber-400"
                      style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                    />
                  ))}
                </div>

                {/* Next Rank Progress Bar */}
                <div className="relative mx-auto mt-4 max-w-xs text-left">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300">
                    <span>{rank.name}</span>
                    <span>{next ? next.name : 'Maksimal unvon!'}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10 shadow-inner">
                    <div
                      className={cn('animate-grow-line h-full rounded-full bg-linear-to-r transition-all duration-700', rank.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {next ? (
                    <p className="mt-1.5 text-center text-xs text-gray-500 dark:text-gray-400">
                      «{next.name}» unvoniga <b className="font-bold text-gray-900 dark:text-white tabular-nums">{remaining}</b> ball qoldi
                    </p>
                  ) : (
                    <p className="mt-1.5 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Barcha asosiy bosqichlar zabt etilgan!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 4 KEY METRICS & QUARTERLY CHART */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs dark:border-edge dark:bg-surface-2">
                <Spinner label="O‘quvchi ma’lumotlari yuklanmoqda..." />
              </div>
            ) : error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : (
              <>
                {/* 4 Stats Cards Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      icon: BookOpen,
                      label: 'O‘tilgan darslar',
                      value: String(stats.totalLessons),
                      desc: 'Jami baholangan',
                      tone: 'text-primary-600 bg-primary-500/10 dark:text-primary-400 dark:bg-primary-500/20',
                      border: 'border-primary-500/20',
                    },
                    {
                      icon: Star,
                      label: '«5» baholar soni',
                      value: String(stats.grade5),
                      desc: `${stats.grade4} ta «4» baho`,
                      tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20',
                      border: 'border-amber-500/20',
                    },
                    {
                      icon: CalendarCheck,
                      label: 'Umumiy davomat',
                      value: `${stats.attendancePct}%`,
                      desc: stats.missed > 0 ? `${stats.excused} sb / ${stats.unexcused} sbs` : 'Kechikish yo‘q',
                      tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/20',
                      border: 'border-emerald-500/20',
                    },
                    {
                      icon: Flame,
                      label: 'Eng uzun seriya',
                      value: `${stats.bestStreak} dars`,
                      desc: 'Uzluksiz faollik',
                      tone: 'text-orange-600 bg-orange-500/10 dark:text-orange-400 dark:bg-orange-500/20',
                      border: 'border-orange-500/20',
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={cn(
                        'flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-xs transition-transform hover:-translate-y-0.5 dark:bg-surface-2',
                        s.border,
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl shadow-xs', s.tone)}>
                          <s.icon size={18} />
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.desc}</span>
                      </div>
                      <div className="mt-3">
                        <p className="font-display text-2xl font-black text-gray-900 tabular-nums dark:text-white leading-tight">
                          {s.value}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quarterly Visual Progress Chart (Now rendered in wide desktop container) */}
                <div className="rounded-2xl border border-gray-200/80 bg-white p-1 shadow-xs dark:border-edge dark:bg-surface-2 overflow-hidden">
                  <StudentQuarterChart
                    entries={data?.[0] ?? []}
                    studentName={activeStudent.name}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: 2-COLUMN TIMELINE & ACHIEVEMENTS */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5 border-t border-gray-200/80 dark:border-edge">
            {/* LEFT: Points Timeline */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-edge dark:bg-surface-2">
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <History size={17} className="text-primary-500" />
                  <span>Ballar tarixi</span>
                </h4>
                <span className="text-xs text-gray-400 font-semibold">{history.length} ta yozuv</span>
              </div>

              {history.length ? (
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {history.map((e) => {
                    const badge = e.badgeId ? badgeDefs.find((d) => d.id === e.badgeId) : null
                    const isPositive = e.delta >= 0
                    return (
                      <div
                        key={e.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-gray-50/80 px-3.5 py-2.5 transition-colors hover:bg-gray-100 dark:border-edge dark:bg-surface-3/80 dark:hover:bg-surface-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-16 shrink-0 text-xs font-bold text-gray-500 tabular-nums dark:text-gray-400">
                            {formatDateShort(e.date)}
                          </span>
                          <span className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100" title={e.reason}>
                            {e.reason}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {badge && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-amber-500/30 ring-inset dark:text-amber-300">
                              <Award size={10} /> {badge.name}
                            </span>
                          )}
                          <span
                            className={cn(
                              'inline-flex min-w-10 items-center justify-center rounded-lg px-2 py-0.5 text-xs font-black tabular-nums shadow-2xs',
                              isPositive
                                ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-red-500/15 text-red-700 ring-1 ring-red-500/30 dark:bg-red-500/20 dark:text-red-300',
                            )}
                          >
                            {isPositive ? `+${e.delta}` : e.delta}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-xs text-gray-400 dark:border-edge">
                  Hozircha ball tarixi yo‘q
                </p>
              )}
            </div>

            {/* RIGHT: Badges & Achievements */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-edge dark:bg-surface-2 flex flex-col gap-4">
              {/* Earned badges header */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                    <Award size={17} className="text-amber-500" />
                    <span>Qo‘lga kiritilgan nishonlar</span>
                  </h4>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {ownBadges.length} ta nishon
                  </span>
                </div>

                {ownBadges.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ownBadges.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-3 rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 shadow-2xs dark:border-amber-500/20"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 shadow-xs">
                          <Award size={19} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-gray-900 dark:text-white">{b.name}</p>
                          <p className="line-clamp-1 text-[11px] text-gray-500 dark:text-gray-400">{b.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400 dark:border-edge">
                    Hali nishon berilmagan — darslardagi a’lo natijalar bilan birinchisini qo‘lga kiriting!
                  </p>
                )}
              </div>

              {/* Achievements Board */}
              <div className="pt-3 border-t border-gray-100 dark:border-edge">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                    <Sparkles size={16} className="text-primary-500" />
                    <span>Yutuqlar va maqsadlar</span>
                  </h4>
                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                    {unlockedCount} / {achievements.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {achievements.map((a) => {
                    const Icon = a.def.icon
                    return (
                      <div
                        key={a.def.id}
                        className={cn(
                          'flex flex-col justify-between rounded-xl border p-3 text-center transition-all',
                          a.unlocked
                            ? a.def.tone
                            : 'border-gray-200 bg-gray-50/90 dark:border-edge dark:bg-surface-3/80',
                        )}
                      >
                        <div>
                          <span
                            className={cn(
                              'mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full shadow-2xs',
                              a.unlocked
                                ? 'bg-white/80 dark:bg-white/10'
                                : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-300',
                            )}
                          >
                            {a.unlocked ? <Icon size={17} /> : <Lock size={15} />}
                          </span>
                          <p
                            className={cn(
                              'text-xs font-bold truncate',
                              a.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200',
                            )}
                          >
                            {a.def.name}
                          </p>
                          <p className="mt-0.5 text-[10px] line-clamp-2 text-gray-500 dark:text-gray-400 leading-tight">
                            {a.def.description}
                          </p>
                        </div>

                        {!a.unlocked && (
                          <div className="mt-2.5">
                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-surface-2">
                              <div
                                className="h-full rounded-full bg-primary-500/80 dark:bg-primary-500 transition-all"
                                style={{ width: `${a.pct}%` }}
                              />
                            </div>
                            <p className="mt-1 text-[10px] font-bold text-gray-500 dark:text-gray-300 tabular-nums">
                              {Math.min(a.value, a.def.target)} / {a.def.target}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Student Class Modal (Requirement 13) */}
      <Modal
        open={transferOpen}
        title="O‘quvchini boshqa sinfga ko‘chirish"
        subtitle={`${activeStudent.name} uchun yangi sinfni belgilash`}
        onClose={() => setTransferOpen(false)}
        size="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">{activeStudent.name}</strong>ni boshqa sinfga ko‘chirish uchun quyidagi ro‘yxatdan yangi sinfni tanlang. O‘quvchining to‘plagan ballari va natijalari saqlanadi.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
              Yangi sinfni tanlang:
            </label>
            <select
              value={selectedNewClassId}
              onChange={(e) => setSelectedNewClassId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm dark:border-edge dark:bg-surface-2 dark:text-white cursor-pointer"
            >
              {allClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade}-«{c.letter}» sinf {c.id === activeStudent.classId ? '(Hozirgi sinfi)' : ''}
                </option>
              ))}
            </select>
          </div>

          {transferError && <p className="text-xs font-bold text-red-500">{transferError}</p>}
          {transferSuccess && (
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center">
              <Check size={14} />
              <span>O‘quvchi yangi sinfga muvaffaqiyatli ko‘chirildi!</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setTransferOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleTransfer}
              disabled={transferring || selectedNewClassId === activeStudent.classId}
            >
              {transferring ? 'Ko‘chirilmoqda...' : 'Sinfni ko‘chirish'}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  )
}
