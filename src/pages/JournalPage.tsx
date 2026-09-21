import { useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  BookOpen,
  CalendarPlus,
  Check,
  Clock3,
  Crown,
  Edit3,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import * as api from '../services/api'
import { QUARTER_NAMES } from '../data/curriculum'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { Field, Input, Select } from '../components/Field'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import { formatDateShort, todayISO } from '../utils/format'
import { cn } from '../utils/cn'
import type { Attendance, JournalEntry } from '../types'

const GRADE_TONES: Record<number, string> = {
  5: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  4: 'bg-primary-500/15 text-primary-600 dark:text-primary-300',
  3: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  2: 'bg-red-500/15 text-red-600 dark:text-red-300',
}

interface CellTarget {
  studentId: string
  studentName: string
  date: string
  lessonTitle: string
  entry?: JournalEntry
}

export default function JournalPage() {
  const { user, isAdmin } = useAuth()
  const [classId, setClassId] = useState<string>('')

  // Grade/attendance/needsWork cell editor
  const [cell, setCell] = useState<CellTarget | null>(null)
  const [cellGrade, setCellGrade] = useState('')
  const [cellAttendance, setCellAttendance] = useState<Attendance>('keldi')
  const [cellNeedsWork, setCellNeedsWork] = useState(false)
  const [cellNote, setCellNote] = useState('')

  // "New conducted lesson" column
  const [colModal, setColModal] = useState(false)
  const [colDate, setColDate] = useState(todayISO())
  const [colQuarter, setColQuarter] = useState(1)
  const [colLesson, setColLesson] = useState('')

  // Class leader modal
  const [leaderModal, setLeaderModal] = useState(false)
  const [selectedLeaderId, setSelectedLeaderId] = useState('')
  const [savingLeader, setSavingLeader] = useState(false)
  const [saveLeaderError, setSaveLeaderError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: classes, loading: classesLoading, error: classesError, reload: reloadClasses } = useFetch(
    () => api.getClasses(),
  )

  // Classes available to this user:
  // Admin sees all classes.
  // Teacher only sees classes where they are sinf rahbari, tutor, or assigned to teach.
  const availableClasses = (classes || []).filter((c) => {
    if (isAdmin) return true
    return (
      c.teacherId === user?.id ||
      c.tutorId === user?.id ||
      (user?.classIds || []).includes(c.id)
    )
  })

  const activeClassId = classId || availableClasses[0]?.id || ''
  const activeClass = availableClasses.find((c) => c.id === activeClassId)

  const { data, loading, error, reload, setData } = useFetch(
    async () => {
      if (!activeClass) return null
      const [students, journal, columns, lessons] = await Promise.all([
        api.getStudents(activeClass.id),
        api.getJournal(activeClass.id),
        api.getJournalColumns(activeClass.id),
        api.getLessonsByGrade(activeClass.grade),
      ])
      return { students, journal, columns, lessons }
    },
    [activeClass?.id],
  )

  const entryMap = useMemo(() => {
    const map = new Map<string, JournalEntry>()
    if (data?.journal) {
      for (const j of data.journal) {
        map.set(`${j.studentId}:${j.date}`, j)
      }
    }
    return map
  }, [data?.journal])

  const lessonMap = useMemo(() => {
    const map = new Map<string, string>()
    if (data?.lessons) {
      for (const l of data.lessons) {
        map.set(l.id, l.title)
      }
    }
    return map
  }, [data?.lessons])

  const studentStats = useMemo(() => {
    const map = new Map<string, string>()
    if (!data?.students || !data?.journal) return map
    for (const s of data.students) {
      let sum = 0
      let count = 0
      for (const j of data.journal) {
        if (j.studentId === s.id && j.grade != null) {
          sum += j.grade
          count++
        }
      }
      map.set(s.id, count ? (sum / count).toFixed(1) : '—')
    }
    return map
  }, [data?.students, data?.journal])

  const lessonTitle = (lessonId: string) => lessonMap.get(lessonId) ?? 'Mavzu'

  if (classesLoading) return <Spinner />
  if (classesError) return <ErrorState message={classesError} onRetry={reloadClasses} />
  if (!availableClasses.length)
    return (
      <EmptyState
        title="Biriktirilgan sinflar topilmadi"
        hint="Sizga dars o‘tish yoki rahbarlik qilish uchun hali sinflar biriktirilmagan. Administratorga murojaat qiling."
      />
    )

  // Admin grades anywhere; a teacher grades in their assigned/led classes
  const canGrade =
    isAdmin ||
    (user?.role === 'teacher' &&
      (activeClass?.teacherId === user?.id ||
        activeClass?.tutorId === user?.id ||
        (user?.classIds || []).includes(activeClass?.id || '')))

  // Admin or the specific class teacher can assign/change class leader
  const canManageLeader = isAdmin || (user?.role === 'teacher' && activeClass?.teacherId === user?.id)

  const openCell = (target: CellTarget) => {
    if (!canGrade) return
    setCell(target)
    setCellGrade(target.entry?.grade ? String(target.entry.grade) : '')
    setCellAttendance(target.entry?.attendance ?? 'keldi')
    setCellNeedsWork(target.entry?.needsWork ?? false)
    setCellNote(target.entry?.note ?? '')
    setSaveError(null)
  }

  const saveCell = async () => {
    if (!cell || !activeClass) return
    setSaving(true)
    setSaveError(null)
    try {
      const { entry } = await api.setJournalCell(activeClass.id, cell.studentId, cell.date, {
        grade: cellAttendance !== 'kelmadi' && cellGrade ? Number(cellGrade) : null,
        attendance: cellAttendance,
        needsWork: cellNeedsWork,
        note: cellNote.trim(),
      })
      setData((prev) =>
        prev === null ? prev : { ...prev, journal: [...prev.journal.filter((j) => j.id !== entry.id), entry] },
      )
      setCell(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  const openColModal = () => {
    setColDate(todayISO())
    setColQuarter(1)
    setColLesson(data?.lessons.find((l) => l.quarter === 1)?.id ?? '')
    setSaveError(null)
    setColModal(true)
  }

  const addColumn = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeClass || !colLesson) return
    setSaving(true)
    setSaveError(null)
    try {
      const column = await api.addJournalColumn(activeClass.id, colDate, colLesson)
      setData((prev) =>
        prev === null
          ? prev
          : { ...prev, columns: [...prev.columns, column].sort((a, b) => a.date.localeCompare(b.date)) },
      )
      setColModal(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  const saveLeader = async () => {
    if (!activeClass) return
    setSavingLeader(true)
    setSaveLeaderError(null)
    try {
      await api.setClassLeader(activeClass.id, selectedLeaderId || null)
      await reloadClasses()
      setLeaderModal(false)
    } catch (err) {
      setSaveLeaderError(err instanceof Error ? err.message : 'Sardorni saqlashda xatolik')
    } finally {
      setSavingLeader(false)
    }
  }

  const quarterLessons = data?.lessons.filter((l) => l.quarter === colQuarter) ?? []

  return (
    <div className="animate-rise">
      <PageHeader
        title="Elektron jurnal"
        subtitle="Har bir sana o‘tilgan mavzuga bog‘lanadi — baho, davomat va kamchiliklar nazorati"
        actions={
          <>
            <Select value={activeClassId} onChange={(e) => setClassId(e.target.value)} className="w-40">
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade}-«{c.letter}» sinf
                </option>
              ))}
            </Select>
            {canGrade && (
              <Button onClick={openColModal}>
                <CalendarPlus size={16} /> Dars o‘tish
              </Button>
            )}
          </>
        }
      />

      {/* Class Status Header Cards (Sinf rahbari, O'quvchilar soni, Sinf sardori) */}
      {activeClass && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Sinf rahbari */}
          <Card className="flex items-center gap-3.5 border-l-4 border-l-primary-500 p-4 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500 dark:bg-primary-500/20">
              <UserCheck size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-400">Sinf rahbari</p>
              <p
                className="truncate text-sm font-bold text-gray-900 dark:text-white"
                title={activeClass.teacherName || 'Biriktirilmagan'}
              >
                {activeClass.teacherName || 'Biriktirilmagan'}
              </p>
            </div>
          </Card>

          {/* O'quvchilar soni */}
          <Card className="flex items-center gap-3.5 border-l-4 border-l-emerald-500 p-4 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
              <Users size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-400">Sinfdagi o‘quvchilar</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {data?.students.length ?? '—'} nafar o‘quvchi
              </p>
            </div>
          </Card>

          {/* Sinf sardori */}
          <Card className="flex items-center justify-between gap-3 border-l-4 border-l-amber-500 p-4 shadow-sm">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20">
                <Crown size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-400">Sinf sardori</p>
                <p
                  className="truncate text-sm font-bold text-gray-900 dark:text-white"
                  title={activeClass.leaderName || 'Belgilanmagan'}
                >
                  {activeClass.leaderName || 'Belgilanmagan'}
                </p>
              </div>
            </div>
            {canManageLeader && (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-xs text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400"
                onClick={() => {
                  setSelectedLeaderId(activeClass.leaderId || '')
                  setSaveLeaderError(null)
                  setLeaderModal(true)
                }}
              >
                <Edit3 size={13} className="mr-1" />
                {activeClass.leaderId ? 'O‘zgartirish' : 'Belgilash'}
              </Button>
            )}
          </Card>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : error || !data ? (
        <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />
      ) : !data.students.length ? (
        <EmptyState title="Bu sinfda o‘quvchilar yo‘q" hint="O‘quvchilar bo‘limidan sinfga o‘quvchi qo‘shing" />
      ) : (
        <Card className="overflow-x-auto shadow-sm">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left dark:border-edge">
                <th className="sticky left-0 bg-white/95 px-4 py-3 font-medium text-gray-500 backdrop-blur dark:bg-surface/95 dark:text-gray-400">
                  O‘quvchi
                </th>
                {data.columns.map((col) => (
                  <th key={col.id} className="px-3 py-2 text-center align-bottom">
                    <span className="block text-xs font-semibold whitespace-nowrap text-gray-700 dark:text-gray-200">
                      {formatDateShort(col.date)}
                    </span>
                    <span
                      className="mx-auto mt-0.5 block max-w-24 truncate text-[10px] font-normal text-gray-400"
                      title={lessonTitle(col.lessonId)}
                    >
                      {lessonTitle(col.lessonId)}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">O‘rtacha</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => {
                const avg = studentStats.get(s.id) ?? '—'
                const isLeader = activeClass?.leaderId === s.id
                return (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50 transition-colors last:border-0 hover:bg-primary-500/3 dark:border-edge/50"
                  >
                    <td className="sticky left-0 bg-white/95 px-4 py-2.5 backdrop-blur dark:bg-surface/95">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} size="sm" />
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">{s.name}</span>
                          {isLeader && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300"
                              title="Sinf sardori"
                            >
                              <Crown size={11} className="fill-amber-500 text-amber-500" />
                              Sardor
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {data.columns.map((col) => {
                      const entry = entryMap.get(`${s.id}:${col.date}`)
                      const hasIssue = entry?.needsWork
                      return (
                        <td key={col.id} className="px-3 py-2.5 text-center">
                          <button
                            onClick={() =>
                              openCell({
                                studentId: s.id,
                                studentName: s.name,
                                date: col.date,
                                lessonTitle: lessonTitle(col.lessonId),
                                entry,
                              })
                            }
                            disabled={!canGrade}
                            className={cn(
                              'relative inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-semibold transition-all',
                              canGrade && 'cursor-pointer hover:scale-110 hover:shadow-md',
                              entry?.attendance === 'kelmadi'
                                ? 'bg-red-500/10 text-red-500'
                                : entry?.grade
                                  ? GRADE_TONES[entry.grade]
                                  : hasIssue
                                    ? 'border border-amber-500/40 bg-amber-500/15 font-bold text-amber-600 dark:text-amber-400'
                                    : 'bg-gray-500/5 text-gray-400 dark:bg-white/5',
                            )}
                            title={
                              entry
                                ? `${entry.attendance === 'kelmadi' ? 'Darsda bo‘lmagan' : entry.attendance === 'kechikdi' ? 'Kechikkan' : entry.grade ? `${entry.grade}-baho` : 'Darsda qatnashgan'}${hasIssue ? ` · ⚠️ Kamchilik: ${entry.note || 'Keyingi darsda so‘ralsin'}` : ''}`
                                : 'Belgilanmagan'
                            }
                          >
                            {entry?.attendance === 'kelmadi' ? (
                              <X size={13} />
                            ) : (
                              <>
                                {entry?.grade ?? (hasIssue ? <AlertCircle size={13} className="text-amber-500" /> : '·')}
                                {entry?.attendance === 'kechikdi' && <Clock3 size={11} className="opacity-70" />}
                              </>
                            )}

                            {/* Burchakdagi kamchilik/keyingi darsda so'rash indikatori */}
                            {hasIssue && entry?.grade != null && (
                              <span
                                className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white dark:ring-surface"
                                title={entry.note ? `Kamchilik: ${entry.note}` : 'Kamchilik bor / keyingi darsda so‘ralsin'}
                              />
                            )}
                          </button>
                        </td>
                      )
                    })}
                    <td className="px-4 py-2.5 text-center font-semibold text-gray-700 tabular-nums dark:text-gray-200">
                      {avg}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-4 py-3 text-xs text-gray-400 dark:border-edge">
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-emerald-500" /> Baho — darsda qatnashgan
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 size={13} className="text-amber-500" /> Kechikkan
            </span>
            <span className="flex items-center gap-1.5">
              <X size={13} className="text-red-500" /> Kelmagan
            </span>
            <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle size={13} /> Kamchilik bor / Keyingi darsda so‘ralsin
            </span>
            {canGrade && <span className="ml-auto hidden sm:inline">Katakchani bosib baho yoki kamchilik belgilang</span>}
          </div>
        </Card>
      )}

      {/* Grade / attendance / issues cell editor */}
      <Modal
        open={cell !== null}
        title={cell ? `${cell.studentName} · ${formatDateShort(cell.date)}` : ''}
        onClose={() => setCell(null)}
      >
        {cell && (
          <div className="flex flex-col gap-4">
            <Chip tone="primary" className="self-start">
              <BookOpen size={12} /> {cell.lessonTitle}
            </Chip>

            <Field label="Davomat">
              <Select value={cellAttendance} onChange={(e) => setCellAttendance(e.target.value as Attendance)}>
                <option value="keldi">Darsda qatnashdi</option>
                <option value="kechikdi">Kechikdi</option>
                <option value="kelmadi">Kelmadi</option>
              </Select>
            </Field>

            <Field label="Baho">
              <Select
                value={cellGrade}
                onChange={(e) => setCellGrade(e.target.value)}
                disabled={cellAttendance === 'kelmadi'}
              >
                <option value="">Baho qo‘yilmagan</option>
                <option value="5">5 — a’lo (+15 ball)</option>
                <option value="4">4 — yaxshi (+10 ball)</option>
                <option value="3">3 — qoniqarli (+5 ball)</option>
                <option value="2">2 — qoniqarsiz (-10 ball jazo)</option>
              </Select>
            </Field>

            {/* Kamchilik bor / Keyingi darsda so'ralsin (balsiz belgilab qo'yish) */}
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 dark:bg-amber-500/10">
              <label className="flex cursor-pointer items-center gap-2.5 select-none">
                <input
                  type="checkbox"
                  checked={cellNeedsWork}
                  onChange={(e) => setCellNeedsWork(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                />
                <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200">
                  <AlertCircle size={15} /> Kamchilik bor / Keyingi darsda so‘ralsin
                </span>
              </label>

              {cellNeedsWork && (
                <div className="mt-3 flex flex-col gap-2">
                  <Input
                    value={cellNote}
                    onChange={(e) => setCellNote(e.target.value)}
                    placeholder="Kamchilik yoki topshiriq izohi (masalan: Daftari yo‘q, 3-mashqni qayta yozadi...)"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {['Daftar yo‘q', 'Vazifa chala', 'Qayta so‘rash', 'Mavzuni tushunmagan', 'Darslik yo‘q'].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCellNote(preset)}
                          className="rounded-md border border-gray-200 bg-white/80 px-2 py-0.5 text-xs text-gray-600 transition-colors hover:border-amber-400 hover:text-amber-600 dark:border-edge dark:bg-surface/80 dark:text-gray-300"
                        >
                          {preset}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
              <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                Balsiz belgilash: baho qo‘yilmasa ham o‘quvchining kamchiligi jurnalda aks etib, keyingi dars uchun eslatma bo‘ladi.
              </p>
            </div>

            <p className="text-xs text-gray-400">
              Baho va davomat o‘quvchining reyting balliga avtomatik hisoblanadi (2 baho uchun 10 ball ayiriladi).
            </p>
            {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCell(null)}>
                Bekor qilish
              </Button>
              <Button onClick={saveCell} disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Set class leader modal */}
      {activeClass && (
        <Modal
          open={leaderModal}
          title={`${activeClass.grade}-«${activeClass.letter}» sinf sardorini belgilash`}
          onClose={() => setLeaderModal(false)}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sinf sardori davomat va sinf intizomida sinf rahbariga ko‘makchi bo‘ladi. Sardor tanlanganda uning ismi jurnalda va profillarda aks etadi.
            </p>
            <Field label="Sinf sardori etib tayinlash">
              <Select value={selectedLeaderId} onChange={(e) => setSelectedLeaderId(e.target.value)}>
                <option value="">— Sardor belgilanmagan —</option>
                {data?.students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </Select>
            </Field>
            {saveLeaderError && <p className="text-sm text-red-500">{saveLeaderError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setLeaderModal(false)}>
                Bekor qilish
              </Button>
              <Button onClick={saveLeader} disabled={savingLeader}>
                {savingLeader ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New conducted lesson */}
      <Modal open={colModal} title="Dars o‘tish — mavzuni tanlang" onClose={() => setColModal(false)}>
        <form onSubmit={addColumn} className="flex flex-col gap-4">
          <Field label="Sana">
            <Input type="date" value={colDate} onChange={(e) => setColDate(e.target.value)} required />
          </Field>
          <Field label="Chorak">
            <Select
              value={colQuarter}
              onChange={(e) => {
                const q = Number(e.target.value)
                setColQuarter(q)
                setColLesson(data?.lessons.find((l) => l.quarter === q)?.id ?? '')
              }}
            >
              {QUARTER_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="O‘tiladigan mavzu">
            <Select value={colLesson} onChange={(e) => setColLesson(e.target.value)} required>
              {quarterLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.order}-dars. {l.title}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-gray-400">
            Jurnalda yangi ustun ochiladi — o‘quvchilarni shu mavzu bo‘yicha baholaysiz.
          </p>
          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setColModal(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Ochilmoqda...' : 'Darsni boshlash'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
