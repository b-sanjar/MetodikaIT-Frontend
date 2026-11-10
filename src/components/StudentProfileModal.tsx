import { useMemo, useState } from 'react'
import {
  ArrowRightLeft,
  Award,
  BookOpen,
  CalendarCheck,
  Check,
  Copy,
  Flame,
  History,
  Link2,
  Lock,
  Sparkles,
  Star,
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
  const ownBadges = activeStudent.badges
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

  return (
    <Modal open title="O‘quvchi profili" onClose={onClose} wide>
      <div className="flex flex-col gap-5">
        {/* Rank hero */}
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border bg-linear-to-b to-transparent p-5 text-center sm:p-6',
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
            <span className="absolute top-3 left-3 rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold text-gray-600 tabular-nums dark:bg-white/10 dark:text-gray-200">
              #{position}-o‘rin
            </span>
          )}

          <div className="relative mx-auto w-fit">
            <Avatar name={activeStudent.name} size="xl" className="animate-pop ring-4 ring-white/50 dark:ring-white/10" />
            <span
              className={cn(
                'absolute -right-1.5 -bottom-1.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white shadow-lg dark:border-white/10 dark:bg-surface-2',
                rank.text,
              )}
            >
              <RankIcon size={17} className="animate-float" />
            </span>
          </div>

          <p className="font-display mt-3 text-xl font-semibold text-gray-900 dark:text-white">{activeStudent.name}</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {allClasses.find((c) => c.id === activeStudent.classId)
                ? `${allClasses.find((c) => c.id === activeStudent.classId)?.grade}-«${allClasses.find((c) => c.id === activeStudent.classId)?.letter}» sinf`
                : `${classLabel} sinf o‘quvchisi`}
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
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-primary-600 transition-colors hover:border-primary-400 hover:text-primary-700 dark:border-edge dark:bg-surface-2 dark:text-primary-400 cursor-pointer shadow-xs"
                title="O‘quvchini boshqa sinfga ko‘chirish"
              >
                <ArrowRightLeft size={11} />
                <span>Sinfni o‘zgartirish</span>
              </button>
            )}
          </div>

          {activeStudent.code && (
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeStudent.code || '')
                  setCopiedPin(true)
                  setTimeout(() => setCopiedPin(false), 2000)
                }}
                title="Faqat PIN-kodni nusxalash"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-semibold transition-all cursor-pointer shadow-xs',
                  copiedPin
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-gray-200 bg-white/80 text-gray-700 hover:border-primary-400 hover:text-primary-600 dark:border-edge dark:bg-surface-2 dark:text-gray-200 dark:hover:border-primary-500/60 dark:hover:text-primary-400',
                )}
              >
                {copiedPin ? (
                  <>
                    <Check size={14} className="text-emerald-500" />
                    <span>Kod nusxalandi!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-gray-400" />
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
                title="Ota-ona uchun to‘g‘ridan-to‘g‘ri havolani (link) nusxalash"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs',
                  copiedLink
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-gray-200 bg-white/80 text-gray-700 hover:border-primary-400 hover:text-primary-600 dark:border-edge dark:bg-surface-2 dark:text-gray-200 dark:hover:border-primary-500/60 dark:hover:text-primary-400',
                )}
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="text-emerald-500" />
                    <span>Havola nusxalandi!</span>
                  </>
                ) : (
                  <>
                    <Link2 size={14} className="text-gray-400" />
                    <span>Havola</span>
                  </>
                )}
              </button>
            </div>
          )}

          <span
            className={cn(
              'mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
              rank.chip,
            )}
          >
            <RankIcon size={13} /> {rank.name}
          </span>

          <p className="font-display mt-3 text-4xl font-semibold text-gray-900 tabular-nums dark:text-white">{points}</p>
          <p className="text-[11px] text-gray-400">umumiy ball</p>

          <div className="mt-1.5 flex items-center justify-center gap-0.5">
            {Array.from({ length: starsFor(activeStudent.points) }).map((_, i) => (
              <Star
                key={i}
                size={15}
                className="animate-pop fill-amber-400 text-amber-400"
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              />
            ))}
          </div>

          {/* Progress to the next rank */}
          <div className="relative mx-auto mt-4 max-w-xs text-left">
            <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span className="font-medium">{rank.name}</span>
              <span>{next ? next.name : 'Eng yuqori unvon!'}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className={cn('animate-grow-line h-full rounded-full bg-linear-to-r', rank.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
            {next && (
              <p className="mt-1 text-center text-[11px] text-gray-400">
                «{next.name}» unvonigacha <b className="tabular-nums">{remaining}</b> ball qoldi
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <Spinner label="Yutuqlar hisoblanmoqda..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            {/* Journal stats */}
            <div className="stagger grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { icon: BookOpen, label: 'Darslar', value: String(stats.totalLessons), tone: 'text-primary-500 bg-primary-500/10' },
                { icon: Star, label: '«5» baholar', value: String(stats.grade5), tone: 'text-amber-500 bg-amber-500/10' },
                {
                  icon: CalendarCheck,
                  label: 'Davomat',
                  value: `${stats.attendancePct}%`,
                  tone: 'text-emerald-500 bg-emerald-500/10',
                  hint: stats.missed > 0 ? `${stats.excused} sb / ${stats.unexcused} sbs` : undefined,
                },
                { icon: Flame, label: 'Eng uzun seriya', value: String(stats.bestStreak), tone: 'text-orange-500 bg-orange-500/10' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-center dark:border-edge dark:bg-surface-2"
                >
                  <span className={cn('mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg', s.tone)}>
                    <s.icon size={15} />
                  </span>
                  <p className="font-display text-lg font-semibold text-gray-900 tabular-nums dark:text-white">{s.value}</p>
                  <p className="text-[11px] text-gray-400">{s.label}</p>
                  {s.hint && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{s.hint}</p>}
                </div>
              ))}
            </div>

            {/* Quarterly Visual Progress & Statistics Chart (Requirement 8) */}
            <StudentQuarterChart
              entries={data?.[0] ?? []}
              studentName={activeStudent.name}
            />

            {/* Points timeline */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                <History size={15} className="text-primary-500" /> Ballar tarixi
              </h3>
              {history.length ? (
                <div className="stagger flex flex-col gap-1.5">
                  {history.map((e) => {
                    const badge = e.badgeId ? badgeDefs.find((d) => d.id === e.badgeId) : null
                    return (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3.5 py-2 dark:border-edge dark:bg-surface-2"
                      >
                        <span className="w-16 shrink-0 text-[11px] text-gray-400 tabular-nums">{formatDateShort(e.date)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-300">{e.reason}</span>
                        {badge && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-500/30 ring-inset dark:text-amber-300">
                            <Award size={10} /> {badge.name}
                          </span>
                        )}
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                            e.delta >= 0
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                              : 'bg-red-500/10 text-red-500 dark:text-red-300',
                          )}
                        >
                          {e.delta >= 0 ? `+${e.delta}` : e.delta}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-center text-xs text-gray-400 dark:border-edge">
                  Hozircha ball tarixi yo‘q
                </p>
              )}
            </div>

            {/* Earned badges */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                <Award size={15} className="text-amber-500" /> Nishonlar
                <span className="text-xs font-normal text-gray-400">({ownBadges.length})</span>
              </h3>
              {ownBadges.length ? (
                <div className="stagger grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ownBadges.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-2.5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 dark:text-amber-300">
                        <Award size={17} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{b.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-center text-xs text-gray-400 dark:border-edge">
                  Hozircha nishonlar yo‘q — faollik bilan birinchisini qo‘lga kiriting!
                </p>
              )}
            </div>

            {/* Achievements board */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                <Sparkles size={15} className="text-primary-500" /> Yutuqlar
                <span className="text-xs font-normal text-gray-400 tabular-nums">
                  ({unlockedCount}/{achievements.length})
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {achievements.map((a, i) => {
                  const Icon = a.def.icon
                  return (
                    <div
                      key={a.def.id}
                      className={cn(
                        'animate-pop rounded-xl border p-3 text-center',
                        a.unlocked
                          ? a.def.tone
                          : 'border-gray-200 bg-gray-50/60 opacity-70 dark:border-edge dark:bg-surface-2',
                      )}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <span
                        className={cn(
                          'mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full',
                          a.unlocked ? 'bg-white/60 dark:bg-white/10' : 'bg-gray-200/60 text-gray-400 dark:bg-white/5',
                        )}
                      >
                        {a.unlocked ? <Icon size={17} /> : <Lock size={15} />}
                      </span>
                      <p
                        className={cn(
                          'text-xs font-semibold',
                          a.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400',
                        )}
                      >
                        {a.def.name}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-tight text-gray-500 dark:text-gray-400">
                        {a.def.description}
                      </p>
                      {!a.unlocked && (
                        <>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                            <div className="h-full rounded-full bg-primary-400/70" style={{ width: `${a.pct}%` }} />
                          </div>
                          <p className="mt-1 text-[10px] text-gray-400 tabular-nums">
                            {Math.min(a.value, a.def.target)}/{a.def.target}
                          </p>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Transfer Student Class Modal (Requirement 13) */}
      <Modal
        open={transferOpen}
        title="O‘quvchini boshqa sinfga ko‘chirish"
        onClose={() => setTransferOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong className="text-gray-900 dark:text-white">{activeStudent.name}</strong>ni boshqa sinfga ko‘chirish uchun quyidagi ro‘yxatdan yangi sinfni tanlang. O‘quvchining to‘plagan ballari va natijalari saqlanadi.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              Yangi sinfni tanlang:
            </label>
            <select
              value={selectedNewClassId}
              onChange={(e) => setSelectedNewClassId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm dark:border-edge dark:bg-surface-2 dark:text-white"
            >
              {allClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade}-«{c.letter}» sinf {c.id === activeStudent.classId ? '(Hozirgi sinfi)' : ''}
                </option>
              ))}
            </select>
          </div>

          {transferError && <p className="text-xs font-medium text-red-500">{transferError}</p>}
          {transferSuccess && (
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-center">
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
