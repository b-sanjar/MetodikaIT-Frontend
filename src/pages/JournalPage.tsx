import { useState, type FormEvent } from 'react'
import { BookOpen, CalendarPlus, Check, Clock3, X } from 'lucide-react'
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

  // Grade/attendance cell editor
  const [cell, setCell] = useState<CellTarget | null>(null)
  const [cellGrade, setCellGrade] = useState('')
  const [cellAttendance, setCellAttendance] = useState<Attendance>('keldi')

  // "New conducted lesson" column
  const [colModal, setColModal] = useState(false)
  const [colDate, setColDate] = useState(todayISO())
  const [colQuarter, setColQuarter] = useState(1)
  const [colLesson, setColLesson] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: classes, loading: classesLoading, error: classesError, reload: reloadClasses } = useFetch(
    () => api.getClasses(),
  )
  const activeClassId = classId || classes?.[0]?.id || ''
  const activeClass = classes?.find((c) => c.id === activeClassId)

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

  if (classesLoading) return <Spinner />
  if (classesError) return <ErrorState message={classesError} onRetry={reloadClasses} />
  if (!classes?.length) return <EmptyState title="Sinflar topilmadi" />

  // Admin grades anywhere; a teacher only in their own classes
  const canGrade = isAdmin || (user?.role === 'teacher' && activeClass?.teacherId === user.id)

  const lessonTitle = (lessonId: string) => data?.lessons.find((l) => l.id === lessonId)?.title ?? 'Mavzu'

  const openCell = (target: CellTarget) => {
    if (!canGrade) return
    setCell(target)
    setCellGrade(target.entry?.grade ? String(target.entry.grade) : '')
    setCellAttendance(target.entry?.attendance ?? 'keldi')
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

  const quarterLessons = data?.lessons.filter((l) => l.quarter === colQuarter) ?? []

  return (
    <div className="animate-rise">
      <PageHeader
        title="Elektron jurnal"
        subtitle="Har bir sana o‘tilgan mavzuga bog‘lanadi — baho va davomat shu yerda"
        actions={
          <>
            <Select value={activeClassId} onChange={(e) => setClassId(e.target.value)} className="w-40">
              {classes.map((c) => (
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

      {loading ? (
        <Spinner />
      ) : error || !data ? (
        <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />
      ) : !data.students.length ? (
        <EmptyState title="Bu sinfda o‘quvchilar yo‘q" hint="O‘quvchilar bo‘limidan sinfga o‘quvchi qo‘shing" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left dark:border-edge">
                <th className="sticky left-0 bg-white/90 px-4 py-3 font-medium text-gray-500 backdrop-blur dark:bg-surface/90 dark:text-gray-400">
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
                const entries = data.journal.filter((j) => j.studentId === s.id)
                const graded = entries.filter((e) => e.grade != null)
                const avg = graded.length
                  ? (graded.reduce((sum, e) => sum + (e.grade ?? 0), 0) / graded.length).toFixed(1)
                  : '—'
                return (
                  <tr key={s.id} className="border-b border-gray-50 transition-colors last:border-0 hover:bg-primary-500/3 dark:border-edge/50">
                    <td className="sticky left-0 bg-white/90 px-4 py-2.5 backdrop-blur dark:bg-surface/90">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} size="sm" />
                        <span className="font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">{s.name}</span>
                      </div>
                    </td>
                    {data.columns.map((col) => {
                      const entry = entries.find((e) => e.date === col.date)
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
                              'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-semibold transition-all',
                              canGrade && 'cursor-pointer hover:scale-110 hover:shadow-md',
                              entry?.attendance === 'kelmadi'
                                ? 'bg-red-500/10 text-red-500'
                                : entry?.grade
                                  ? GRADE_TONES[entry.grade]
                                  : 'bg-gray-500/5 text-gray-400 dark:bg-white/5',
                            )}
                            title={
                              entry
                                ? entry.attendance === 'kelmadi'
                                  ? 'Darsda bo‘lmagan'
                                  : entry.attendance === 'kechikdi'
                                    ? 'Kechikkan'
                                    : 'Darsda qatnashgan'
                                : 'Belgilanmagan'
                            }
                          >
                            {entry?.attendance === 'kelmadi' ? (
                              <X size={13} />
                            ) : (
                              <>
                                {entry?.grade ?? '·'}
                                {entry?.attendance === 'kechikdi' && <Clock3 size={11} className="opacity-70" />}
                              </>
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
            {canGrade && <span className="ml-auto hidden sm:inline">Katakchani bosib baho qo‘ying</span>}
          </div>
        </Card>
      )}

      {/* Grade a cell */}
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
                <option value="2">2 — qoniqarsiz</option>
              </Select>
            </Field>
            <p className="text-xs text-gray-400">Baho va davomat o‘quvchining reyting balliga avtomatik qo‘shiladi.</p>
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
