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
    const isAbsent = cellAttendance === 'kelmadi' || cellAttendance === 'sababli' || cellAttendance === 'sababsiz'
    try {
      const { entry } = await api.setJournalCell(activeClass.id, cell.studentId, cell.date, {
        grade: !isAbsent && cellGrade ? Number(cellGrade) : null,
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
      const res = (await api.addJournalColumn(activeClass.id, colDate, colLesson)) as any
      const column = {
        id: res.id,
        classId: res.classId,
        date: res.date,
        lessonId: res.lessonId,
      }
      const newEntries: JournalEntry[] = res.entries || []
      setData((prev) => {
        if (!prev) return prev
        const existingEntryIds = new Set(newEntries.map((e) => e.id))
        const filteredJournal = prev.journal.filter((j) => !existingEntryIds.has(j.id))
        return {
          ...prev,
          columns: [...prev.columns.filter((c) => c.id !== column.id), column].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
          journal: [...filteredJournal, ...newEntries],
        }
      })
      setColModal(false)
      reload()
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
                              entry?.attendance === 'sababli'
                                ? 'border border-sky-500/40 bg-sky-500/15 font-bold text-sky-600 dark:text-sky-300'
                                : entry?.attendance === 'kelmadi' || entry?.attendance === 'sababsiz'
                                  ? 'bg-red-500/10 text-red-500 font-bold'
                                  : entry?.grade
                                    ? GRADE_TONES[entry.grade]
                                    : hasIssue
                                      ? 'border border-amber-500/40 bg-amber-500/15 font-bold text-amber-600 dark:text-amber-400'
                                      : entry?.attendance === 'keldi'
                                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                                        : 'bg-gray-500/5 text-gray-400 dark:bg-white/5',
                            )}
                            title={
                              entry
                                ? `${entry.attendance === 'sababli' ? `Sababli kelmagan${entry.note ? ` (${entry.note})` : ''}` : entry.attendance === 'sababsiz' || entry.attendance === 'kelmadi' ? 'Sababsiz kelmagan' : entry.grade ? `${entry.grade}-baho` : entry.attendance === 'kechikdi' ? 'Kechikkan (+1 ball)' : 'Darsda qatnashgan (+2 ball)'}${hasIssue ? ` · ⚠️ Kamchilik: ${entry.note || 'Keyingi darsda so‘ralsin'}` : ''}`
                                : 'Belgilanmagan'
                            }
                          >
                            {entry?.attendance === 'sababli' ? (
                              <span className="text-[11px] font-bold tracking-tight">Sb</span>
                            ) : entry?.attendance === 'kelmadi' || entry?.attendance === 'sababsiz' ? (
                              <X size={13} strokeWidth={2.5} />
                            ) : (
                              <>
                                {entry?.grade ?? (hasIssue ? <AlertCircle size={13} className="text-amber-500" /> : entry?.attendance === 'keldi' ? <Check size={13} className="text-emerald-500" /> : '·')}
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
              <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-bold">
                <Check size={12} />
              </span>
              Qatnashgan (+2 ball)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-500/15 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                5
              </span>
              Baho (5, 4, 3, 2)
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 size={13} className="text-amber-500" /> Kechikkan (+1 ball)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-4 items-center rounded bg-sky-500/15 px-1 text-[10px] font-bold text-sky-600 dark:text-sky-300">Sb</span> Sababli kelmagan
            </span>
            <span className="flex items-center gap-1.5">
              <X size={13} className="text-red-500" /> Sababsiz kelmagan
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
        {cell && (() => {
          const isAbsent = cellAttendance === 'kelmadi' || cellAttendance === 'sababli' || cellAttendance === 'sababsiz'
          return (
            <div className="flex flex-col gap-4">
              <Chip tone="primary" className="self-start">
                <BookOpen size={12} /> {cell.lessonTitle}
              </Chip>

              {/* Davomat holati tanlash (Dropdown o'rniga to'g'ridan-to'g'ri tugmalar) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-200">
                  Davomat holati
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    {
                      value: 'keldi',
                      label: 'Keldi',
                      desc: 'Darsda qatnashdi',
                      icon: Check,
                      activeClass:
                        'border-emerald-500 bg-emerald-500/15 text-emerald-700 ring-2 ring-emerald-500/40 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300',
                    },
                    {
                      value: 'kechikdi',
                      label: 'Kechikdi',
                      desc: 'Kechikib keldi',
                      icon: Clock3,
                      activeClass:
                        'border-amber-500 bg-amber-500/15 text-amber-700 ring-2 ring-amber-500/40 dark:border-amber-400 dark:bg-amber-500/20 dark:text-amber-300',
                    },
                    {
                      value: 'sababli',
                      label: 'Sababli',
                      desc: 'Kelmadi (sababli)',
                      icon: UserCheck,
                      activeClass:
                        'border-sky-500 bg-sky-500/15 text-sky-700 ring-2 ring-sky-500/40 dark:border-sky-400 dark:bg-sky-500/20 dark:text-sky-300',
                    },
                    {
                      value: 'sababsiz',
                      label: 'Sababsiz',
                      desc: 'Kelmadi (sababsiz)',
                      icon: X,
                      activeClass:
                        'border-red-500 bg-red-500/15 text-red-700 ring-2 ring-red-500/40 dark:border-red-400 dark:bg-red-500/20 dark:text-red-300',
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    const isSelected =
                      cellAttendance === item.value ||
                      (item.value === 'sababsiz' && cellAttendance === 'kelmadi')
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          const newAtt = item.value as Attendance
                          setCellAttendance(newAtt)
                          if (newAtt === 'sababli' || newAtt === 'sababsiz' || newAtt === 'kelmadi') {
                            setCellGrade('')
                          }
                        }}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer',
                          isSelected
                            ? item.activeClass
                            : 'border-gray-200 bg-white/60 text-gray-600 hover:border-gray-300 hover:bg-gray-50/80 dark:border-edge dark:bg-surface-2 dark:text-gray-400 dark:hover:border-gray-600',
                        )}
                      >
                        <Icon size={18} className="mb-1" />
                        <span className="text-xs font-bold leading-tight">{item.label}</span>
                        <span className="text-[10px] opacity-75">{item.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sababli kelmagan bo'lsa sababini kiritish */}
              {cellAttendance === 'sababli' && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 dark:bg-sky-500/10">
                  <label className="block text-xs font-semibold text-sky-800 dark:text-sky-200 mb-1.5">
                    Sababini belgilash / izoh
                  </label>
                  <Input
                    value={cellNote}
                    onChange={(e) => setCellNote(e.target.value)}
                    placeholder="Masalan: Kasallik tufayli, Shifokor ma'lumotnomasi, Musobaqada..."
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Kasallik / Shifokor', 'Oila sababli', 'Musobaqa / Tadbir', 'Ariza asosida'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCellNote(preset)}
                        className="rounded-md border border-sky-200 bg-white/90 px-2 py-0.5 text-xs text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-surface dark:text-sky-300"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Baho qo'yish (Dropdownda emas, bevosita katta qulay tugmalar) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    Darsdagi bahosi
                  </label>
                  {cellGrade && !isAbsent && (
                    <button
                      type="button"
                      onClick={() => setCellGrade('')}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Bahoni tozalash ✕
                    </button>
                  )}
                </div>

                {isAbsent ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-3.5 text-center text-xs text-gray-500 dark:border-edge dark:bg-surface-2 dark:text-gray-400">
                    ⚠️ O‘quvchi darsga kelmagan deb belgilanganda baho qo‘yilmaydi.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      {
                        val: '5',
                        title: 'A’lo',
                        pts: '+15 ball',
                        tone: 'border-emerald-500 text-emerald-600 dark:text-emerald-300',
                        bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
                        active: 'bg-emerald-500 text-white ring-2 ring-emerald-500/50 shadow-md shadow-emerald-500/30',
                      },
                      {
                        val: '4',
                        title: 'Yaxshi',
                        pts: '+10 ball',
                        tone: 'border-primary-500 text-primary-600 dark:text-primary-300',
                        bg: 'bg-primary-500/10 hover:bg-primary-500/20',
                        active: 'bg-primary-500 text-white ring-2 ring-primary-500/50 shadow-md shadow-primary-500/30',
                      },
                      {
                        val: '3',
                        title: 'Qoniqarli',
                        pts: '+5 ball',
                        tone: 'border-amber-500 text-amber-600 dark:text-amber-300',
                        bg: 'bg-amber-500/10 hover:bg-amber-500/20',
                        active: 'bg-amber-500 text-white ring-2 ring-amber-500/50 shadow-md shadow-amber-500/30',
                      },
                      {
                        val: '2',
                        title: 'Qoniqarsiz',
                        pts: '-10 ball',
                        tone: 'border-red-500 text-red-600 dark:text-red-300',
                        bg: 'bg-red-500/10 hover:bg-red-500/20',
                        active: 'bg-red-500 text-white ring-2 ring-red-500/50 shadow-md shadow-red-500/30',
                      },
                    ].map((gradeBtn) => {
                      const isSelected = cellGrade === gradeBtn.val
                      return (
                        <button
                          key={gradeBtn.val}
                          type="button"
                          onClick={() => setCellGrade(isSelected ? '' : gradeBtn.val)}
                          className={cn(
                            'relative flex flex-col items-center justify-center rounded-xl border p-3 transition-all cursor-pointer select-none',
                            isSelected
                              ? gradeBtn.active
                              : cn('border-gray-200 dark:border-edge bg-white/70 dark:bg-surface-2', gradeBtn.bg),
                          )}
                        >
                          <span className={cn('text-2xl font-black leading-none', !isSelected && gradeBtn.tone)}>
                            {gradeBtn.val}
                          </span>
                          <span className={cn('mt-1 text-xs font-semibold', isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-200')}>
                            {gradeBtn.title}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-medium',
                              isSelected ? 'text-white/80' : 'text-gray-400 dark:text-gray-500',
                            )}
                          >
                            {gradeBtn.pts}
                          </span>
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-gray-900 shadow text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

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
          )
        })()}
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
