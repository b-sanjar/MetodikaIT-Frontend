import { useMemo, useState } from 'react'
import { Award, Crown, Info, Medal, Plus, Star } from 'lucide-react'
import * as api from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import StudentProfileModal from '../components/StudentProfileModal'
import { Field, Select } from '../components/Field'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import { POINT_RULES } from '../utils/points'
import { RANKS, rankFor, starsFor } from '../utils/gamification'
import { cn } from '../utils/cn'
import type { Student } from '../types'

const PODIUM = [
  {
    card: 'from-amber-400/25 to-transparent border-amber-400/50 sm:shadow-xl sm:shadow-amber-500/20',
    glow: 'bg-amber-400/35',
    rank: 'from-amber-400 to-orange-500 shadow-amber-500/40',
  },
  {
    card: 'from-gray-400/20 to-transparent border-gray-400/40',
    glow: 'bg-gray-400/25',
    rank: 'from-gray-400 to-slate-500 shadow-gray-500/40',
  },
  {
    card: 'from-orange-400/15 to-transparent border-orange-400/30',
    glow: 'bg-orange-400/25',
    rank: 'from-orange-400 to-amber-600 shadow-orange-500/40',
  },
]

export default function LeaderboardPage() {
  const { canTeach } = useAuth()
  const [classFilter, setClassFilter] = useState('all')
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [rewarding, setRewarding] = useState<Student | null>(null)
  const [rewardPoints, setRewardPoints] = useState('10')
  const [rewardBadge, setRewardBadge] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data, loading, error, reload, setData } = useFetch(async () => {
    const [students, classes, badgeDefs] = await Promise.all([
      api.getStudents(),
      api.getClasses(),
      api.getBadgeDefs(),
    ])
    return { students, classes, badgeDefs }
  })

  const ranked = useMemo(() => {
    if (!data) return []
    const list = classFilter === 'all' ? data.students : data.students.filter((s) => s.classId === classFilter)
    return [...list].sort((a, b) => b.points - a.points)
  }, [data, classFilter])

  if (loading) return <Spinner />
  if (error || !data) return <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />

  const badgeDefs = data.badgeDefs

  const className = (id: string) => {
    const c = data.classes.find((k) => k.id === id)
    return c ? `${c.grade}-«${c.letter}»` : '—'
  }

  const giveReward = async () => {
    if (!rewarding) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await api.addPoints(rewarding.id, Number(rewardPoints), rewardBadge || undefined)
      setData((prev) => ({
        ...prev,
        students: prev.students.map((s) => (s.id === updated.id ? updated : s)),
      }))
      setRewarding(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  const podium = ranked.slice(0, 3)
  const rest = ranked.slice(3)
  // Profile modal reads the fresh student from the list so reward updates show through
  const viewingIndex = ranked.findIndex((s) => s.id === viewingId)
  const viewing = viewingIndex >= 0 ? ranked[viewingIndex] : null

  return (
    <div className="animate-rise">
      <PageHeader
        title="O‘quvchilar reytingi"
        subtitle="Ball, unvon va yutuqlar — o‘quvchini bosib to‘liq profilini ko‘ring"
        actions={
          <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="w-44">
            <option value="all">Barcha sinflar</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade}-«{c.letter}» sinf
              </option>
            ))}
          </Select>
        }
      />

      {!ranked.length ? (
        <EmptyState title="Bu sinfda o‘quvchilar yo‘q" />
      ) : (
        <>
          {/* Podium */}
          <div className="stagger mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {podium.map((s, i) => {
              const rank = rankFor(s.points)
              const RankIcon = rank.icon
              return (
                <Card
                  key={s.id}
                  hover
                  onClick={() => setViewingId(s.id)}
                  className={cn(
                    'relative cursor-pointer overflow-hidden border bg-linear-to-b p-5 text-center',
                    PODIUM[i].card,
                  )}
                >
                  <div
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute -top-14 left-1/2 h-32 w-52 -translate-x-1/2 rounded-full blur-3xl',
                      PODIUM[i].glow,
                    )}
                  />
                  <span
                    className={cn(
                      'absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white shadow-lg ring-1 ring-white/30 ring-inset',
                      PODIUM[i].rank,
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="absolute top-3 right-3 text-gray-300 dark:text-gray-600">
                    {i === 0 ? (
                      <Crown size={20} className="animate-float text-amber-400" />
                    ) : (
                      <Medal size={20} />
                    )}
                  </div>
                  <Avatar name={s.name} size="lg" className="mx-auto" />
                  <p className="mt-3 font-semibold text-gray-900 dark:text-white">{s.name}</p>
                  <p className="text-xs text-gray-400">{className(s.classId)} sinf</p>
                  <span
                    className={cn(
                      'mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                      rank.chip,
                    )}
                  >
                    <RankIcon size={11} /> {rank.name}
                  </span>
                  <div className="mt-2 flex items-center justify-center gap-0.5">
                    {Array.from({ length: starsFor(s.points) }).map((_, k) => (
                      <Star key={k} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="font-display mt-2 text-3xl font-semibold text-gray-900 tabular-nums dark:text-white">{s.points}</p>
                  <p className="text-[11px] text-gray-400">ball</p>
                </Card>
              )
            })}
          </div>

          {/* Table */}
          <Card className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left dark:border-edge">
                  <th className="w-12 px-4 py-3 font-medium text-gray-500 dark:text-gray-400">#</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">O‘quvchi</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Sinf</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Unvon</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Nishonlar</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Ball</th>
                  {canTeach && <th className="w-24 px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {rest.map((s, i) => {
                  const rank = rankFor(s.points)
                  const RankIcon = rank.icon
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setViewingId(s.id)}
                      className="cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-primary-500/5 dark:border-edge/50 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-400 tabular-nums">{i + 4}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.name} size="sm" />
                          <span className="font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">{className(s.classId)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset',
                            rank.chip,
                          )}
                        >
                          <RankIcon size={11} /> {rank.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.badges.length ? (
                            s.badges.map((b) => {
                              const def = badgeDefs.find((d) => d.id === b)
                              return (
                                <Chip key={b} tone="amber" className="gap-1">
                                  <Award size={11} /> {def?.name ?? b}
                                </Chip>
                              )
                            })
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums dark:text-white">
                        {s.points}
                      </td>
                      {canTeach && (
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRewarding(s)
                              setRewardPoints('10')
                              setRewardBadge('')
                              setSaveError(null)
                            }}
                          >
                            <Plus size={13} /> Ball
                          </Button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>

          {/* How points are earned */}
          <Card className="mt-6 p-5 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                <Info size={16} />
              </span>
              Ballar qanday to‘planadi?
            </h2>
            <p className="mb-4 text-xs text-gray-400">
              Jurnaldagi baho va davomat avtomatik ballga aylanadi, o‘qituvchi esa faollik uchun qo‘shimcha rag‘bat beradi
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {POINT_RULES.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 dark:border-edge dark:bg-surface-2"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-300">{r.label}</span>
                  <Chip tone="green">{r.value}</Chip>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-edge">
              <span className="text-xs text-gray-400">Unvonlar:</span>
              {RANKS.map((r) => {
                const RankIcon = r.icon
                return (
                  <span
                    key={r.id}
                    title={`${r.min}+ ball`}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset',
                      r.chip,
                    )}
                  >
                    <RankIcon size={11} /> {r.name} · {r.min}+
                  </span>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-edge">
              <span className="text-xs text-gray-400">Nishonlar:</span>
              {badgeDefs.map((b) => (
                <Chip key={b.id} tone="amber" className="gap-1" title={b.description}>
                  <Award size={11} /> {b.name}
                </Chip>
              ))}
            </div>
          </Card>
        </>
      )}

      <StudentProfileModal
        student={viewing}
        position={viewingIndex + 1}
        classLabel={viewing ? className(viewing.classId) : ''}
        badgeDefs={badgeDefs}
        onClose={() => setViewingId(null)}
      />

      <Modal open={rewarding !== null} title={rewarding ? `Rag‘batlantirish: ${rewarding.name}` : ''} onClose={() => setRewarding(null)}>
        <div className="flex flex-col gap-4">
          <Field label="Ball qo‘shish">
            <Select value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)}>
              <option value="5">+5 — faollik uchun</option>
              <option value="10">+10 — yaxshi javob uchun</option>
              <option value="20">+20 — a’lo amaliy ish uchun</option>
              <option value="50">+50 — loyiha g‘olibi</option>
            </Select>
          </Field>
          <Field label="Nishon (ixtiyoriy)">
            <Select value={rewardBadge} onChange={(e) => setRewardBadge(e.target.value)}>
              <option value="">Nishonsiz</option>
              {badgeDefs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.description}
                </option>
              ))}
            </Select>
          </Field>
          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRewarding(null)}>
              Bekor qilish
            </Button>
            <Button onClick={giveReward} disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Tasdiqlash'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
