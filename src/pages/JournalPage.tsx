import { useMemo, useState, useEffect, type FormEvent } from 'react'
import {
  AlertCircle,
  BookOpen,
  CalendarPlus,
  Check,
  ClipboardList,
  Clock3,
  Crown,
  Edit3,
  FileCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import * as api from '../services/api'
import { QUARTER_NAMES } from '../data/curriculum'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import { useQuarter } from '../context/QuarterContext'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import StudentProfileModal from '../components/StudentProfileModal'
import TopicCombobox from '../components/TopicCombobox'
import { Field, Input, Select } from '../components/Field'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import { formatDateShort, todayISO } from '../utils/format'
import { cn } from '../utils/cn'
import type { Attendance, BadgeDef, JournalColumn, JournalEntry, Lesson, Student } from '../types'

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

function inferQuarter(col: JournalColumn, lesson?: Lesson): number {
  if (col.quarter && col.quarter >= 1 && col.quarter <= 4) return col.quarter
  if (lesson?.quarter && lesson.quarter >= 1 && lesson.quarter <= 4) return lesson.quarter
  if (col.date) {
    const parts = col.date.split('-')
    const month = Number(parts[1])
    if (month >= 9 && month <= 10) return 1
    if (month >= 11 && month <= 12) return 2
    if (month >= 1 && month <= 3) return 3
    if (month >= 4 && month <= 6) return 4
  }
  return 1
}

function isControlLesson(col: JournalColumn, lesson?: Lesson): boolean {
  if (col.lessonType === 'control' || lesson?.lessonType === 'control') return true
  const title = (lesson?.title || '').toLowerCase()
  return (
    title.includes('nazorat') ||
    title.includes('oraliq') ||
    title.includes('bsb') ||
    title.includes('chsb')
  )
}

export default function JournalPage() {
  const { user, isAdmin } = useAuth()
  const { quarter: activeQuarter, setQuarter: setActiveQuarter } = useQuarter()

  // Class Selection state (persisted to localStorage)
  const [classId, setClassId] = useState<string>(() => {
    return localStorage.getItem('mit:journal_active_class') || ''
  })

  // Grade/attendance/needsWork cell editor
  const [cell, setCell] = useState<CellTarget | null>(null)
  const [cellGrade, setCellGrade] = useState('')
  const [cellAttendance, setCellAttendance] = useState<Attendance>('keldi')
  const [cellNeedsWork, setCellNeedsWork] = useState(false)
  const [cellNote, setCellNote] = useState('')

  // "New conducted lesson" column modal
  const [colModal, setColModal] = useState(false)
  const [colDate, setColDate] = useState(todayISO())
  const [colLesson, setColLesson] = useState('')
  const [colLessonType, setColLessonType] = useState<'standard' | 'control' | 'practical'>('standard')

  // Cancel/Delete conducted lesson modal
  const [deletingCol, setDeletingCol] = useState<JournalColumn | null>(null)
  const [deletingColLoading, setDeletingColLoading] = useState(false)
  const [deletingColError, setDeletingColError] = useState<string | null>(null)

  // Class leader modal
  const [leaderModal, setLeaderModal] = useState(false)
  const [selectedLeaderId, setSelectedLeaderId] = useState('')
  const [savingLeader, setSavingLeader] = useState(false)
  const [saveLeaderError, setSaveLeaderError] = useState<string | null>(null)

  // Student Profile / Statistics Modal (Requirement 10)
  const [inspectStudent, setInspectStudent] = useState<Student | null>(null)
  const [badgeDefs, setBadgeDefs] = useState<BadgeDef[]>([])

  const [savingCol, setSavingCol] = useState(false)
  const [saveColError, setSaveColError] = useState<string | null>(null)

  // Fetch Badge definitions once
  useEffect(() => {
    api.getBadgeDefs().then(setBadgeDefs).catch(() => {})
  }, [])

  // Fetch classes
  const { data: classes, loading: classesLoading, error: classesError, reload: reloadClasses } = useFetch(
    () => api.getClasses(),
  )

  // Classes available to this user:
  const availableClasses = useMemo(() => {
    return (classes || []).filter((c) => {
      if (isAdmin) return true
      return (
        c.teacherId === user?.id ||
        c.tutorId === user?.id ||
        (user?.classIds || []).includes(c.id)
      )
    })
  }, [classes, isAdmin, user])

  // Active class determination
  const activeClassId = useMemo(() => {
    if (classId && availableClasses.some((c) => c.id === classId)) {
      return classId
    }
    return availableClasses[0]?.id || ''
  }, [classId, availableClasses])

  const activeClass = availableClasses.find((c) => c.id === activeClassId)

  // Change class and persist
  const handleSelectClass = (newClassId: string) => {
    setClassId(newClassId)
    try {
      localStorage.setItem('mit:journal_active_class', newClassId)
    } catch {}
  }

  // Load Journal data for activeClass
  const { data, loading, isRefetching, error, reload, setData } = useFetch(
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

  // Map lessonId -> lesson
  const lessonsById = useMemo(() => {
    const map = new Map<string, Lesson>()
    if (data?.lessons) {
      for (const l of data.lessons) {
        map.set(l.id, l)
      }
    }
    return map
  }, [data?.lessons])

  const lessonTitle = (lessonId: string) => lessonsById.get(lessonId)?.title ?? 'Mavzu'

  // Filter columns strictly by active quarter (Requirements 5 & 6)
  const quarterColumns = useMemo(() => {
    if (!data?.columns) return []
    return data.columns.filter((col) => {
      const q = inferQuarter(col, lessonsById.get(col.lessonId))
      return q === activeQuarter
    })
  }, [data?.columns, lessonsById, activeQuarter])

  // Entry lookup map for quick cell rendering
  const entryMap = useMemo(() => {
    const map = new Map<string, JournalEntry>()
    if (data?.journal) {
      for (const j of data.journal) {
        map.set(`${j.studentId}:${j.date}`, j)
      }
    }
    return map
  }, [data?.journal])

  // Student stats calculated strictly for the visible quarter!
  const studentQuarterStats = useMemo(() => {
    const map = new Map<string, { avg: string; count: number; sum: number }>()
    if (!data?.students || !quarterColumns.length) return map

    const validDates = new Set(quarterColumns.map((c) => c.date))

    for (const s of data.students) {
      let sum = 0
      let count = 0
      for (const col of quarterColumns) {
        const j = entryMap.get(`${s.id}:${col.date}`)
        if (j && validDates.has(j.date) && j.grade != null) {
          sum += j.grade
          count++
        }
      }
      map.set(s.id, {
        avg: count ? (sum / count).toFixed(1) : '—',
        count,
        sum,
      })
    }
    return map
  }, [data?.students, quarterColumns, entryMap])

  if (classesLoading) return <Spinner />
  if (classesError) return <ErrorState message={classesError} onRetry={reloadClasses} />
  if (!availableClasses.length)
    return (
      <EmptyState
        title="Biriktirilgan sinflar topilmadi"
        hint="Sizga dars o‘tish yoki rahbarlik qilish uchun hali sinflar biriktirilmagan. Administratorga murojaat qiling."
      />
    )

  // Permissions
  const canGrade =
    isAdmin ||
    (user?.role === 'teacher' &&
      (activeClass?.teacherId === user?.id ||
        activeClass?.tutorId === user?.id ||
        (user?.classIds || []).includes(activeClass?.id || '')))

  const canManageLeader = isAdmin || (user?.role === 'teacher' && activeClass?.teacherId === user?.id)

  const openCell = (target: CellTarget) => {
    if (!canGrade) return
    setCell(target)
    setCellGrade(target.entry?.grade ? String(target.entry.grade) : '')
    setCellAttendance(target.entry?.attendance ?? 'keldi')
    setCellNeedsWork(target.entry?.needsWork ?? false)
    setCellNote(target.entry?.note ?? '')
  }

  // OPTIMISTIC CELL SAVING (Requirement 4)
  const saveCell = () => {
    if (!cell || !activeClass) return
    const isAbsent = cellAttendance === 'kelmadi' || cellAttendance === 'sababli' || cellAttendance === 'sababsiz'
    const targetGrade = !isAbsent && cellGrade ? Number(cellGrade) : null
    const targetNote = cellNote.trim()

    const optimisticEntry: JournalEntry = {
      id: cell.entry?.id || `temp-${cell.studentId}-${cell.date}`,
      classId: activeClass.id,
      studentId: cell.studentId,
      date: cell.date,
      grade: targetGrade,
      attendance: cellAttendance,
      needsWork: cellNeedsWork,
      note: targetNote,
    }

    // 1. Immediately update UI state with 0ms perceived latency
    setData((prev) => {
      if (!prev) return prev
      const filtered = prev.journal.filter(
        (j) => !(j.studentId === cell.studentId && j.date === cell.date)
      )
      return { ...prev, journal: [...filtered, optimisticEntry] }
    })

    const currentCell = cell
    // 2. Immediately close modal
    setCell(null)

    // 3. Make background call to backend
    api.setJournalCell(activeClass.id, currentCell.studentId, currentCell.date, {
      grade: targetGrade,
      attendance: cellAttendance,
      needsWork: cellNeedsWork,
      note: targetNote,
    }).then(({ entry }) => {
      setData((prev) => {
        if (!prev) return prev
        const filtered = prev.journal.filter(
          (j) => !(j.studentId === entry.studentId && j.date === entry.date)
        )
        return { ...prev, journal: [...filtered, entry] }
      })
    }).catch((err) => {
      // Revert if error occurs
      setData((prev) => {
        if (!prev) return prev
        const filtered = prev.journal.filter(
          (j) => !(j.studentId === currentCell.studentId && j.date === currentCell.date)
        )
        return { ...prev, journal: currentCell.entry ? [...filtered, currentCell.entry] : filtered }
      })
      alert(`Xatolik: Bahoni saqlashda uzilish yuz berdi: ${err instanceof Error ? err.message : 'Server bilan aloqa yo‘q'}`)
    })
  }

  // Open "Dars o'tish" column modal
  const openColModal = () => {
    setColDate(todayISO())
    // Default lesson to active quarter's lessons (Requirement 5 & 6)
    const quarterLessons = data?.lessons.filter((l) => l.quarter === activeQuarter) || []
    setColLesson(quarterLessons[0]?.id || '')
    setColLessonType('standard')
    setSaveColError(null)
    setColModal(true)
  }

  // Add column (Requirement 9 & 11)
  const addColumn = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeClass || !colLesson) return
    setSavingCol(true)
    setSaveColError(null)
    try {
      const res = (await api.addJournalColumn(
        activeClass.id,
        colDate,
        colLesson,
        activeQuarter,
        colLessonType,
      )) as any

      const column: JournalColumn = {
        id: res.id,
        classId: res.classId,
        date: res.date,
        lessonId: res.lessonId,
        quarter: res.quarter || activeQuarter,
        lessonType: res.lessonType || colLessonType,
      }
      const newEntries: JournalEntry[] = res.entries || []
      setData((prev) => {
        if (!prev) return prev
        const existingEntryIds = new Set(newEntries.map((item) => item.id))
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
      setSaveColError(err instanceof Error ? err.message : 'Dars ochishda xatolik yuz berdi')
    } finally {
      setSavingCol(false)
    }
  }

  // Cancel/Delete conducted lesson column (Requirement 11)
  const confirmDeleteColumn = async () => {
    if (!deletingCol) return
    setDeletingColLoading(true)
    setDeletingColError(null)
    try {
      await api.deleteJournalColumn(deletingCol.id)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          columns: prev.columns.filter((c) => c.id !== deletingCol.id),
          journal: prev.journal.filter((j) => j.date !== deletingCol.date),
        }
      })
      setDeletingCol(null)
    } catch (err) {
      setDeletingColError(err instanceof Error ? err.message : 'Darsni bekor qilishda xatolik yuz berdi')
    } finally {
      setDeletingColLoading(false)
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

  const activeQuarterLessons = useMemo(() => {
    return (data?.lessons || []).filter((l) => l.quarter === activeQuarter)
  }, [data?.lessons, activeQuarter])

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        title="Elektron jurnal"
        subtitle="Har bir sana o‘tilgan mavzuga bog‘lanadi — baho, davomat va kamchiliklar nazorati"
        actions={
          canGrade && (
            <Button onClick={openColModal} className="shadow-xs">
              <CalendarPlus size={16} /> Dars o‘tish
            </Button>
          )
        }
      />

      {/* Class Selector Bar (Requirement 2 & 3: Fast, intuitive, modern pill selector) */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-edge dark:bg-surface">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Sinflar:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {availableClasses.map((c) => {
                const isSelected = c.id === activeClassId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClass(c.id)}
                    className={cn(
                      'group relative inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer select-none',
                      isSelected
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25 ring-2 ring-primary-500/30'
                        : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-700 dark:border-edge dark:bg-surface-2 dark:text-gray-200 dark:hover:border-primary-500/40',
                    )}
                  >
                    <span>{c.grade}-«{c.letter}»</span>
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quarter Navigation Tabs (Requirement 5 & 6) */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-surface-2 self-start sm:self-auto">
            {QUARTER_NAMES.map((name, i) => {
              const qNum = i + 1
              const isActive = activeQuarter === qNum
              return (
                <button
                  key={qNum}
                  type="button"
                  onClick={() => setActiveQuarter(qNum)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer',
                    isActive
                      ? 'bg-white text-primary-600 shadow-sm dark:bg-surface dark:text-primary-400'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
                  )}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Class Status Header Cards */}
      {activeClass && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Sinf rahbari */}
          <Card className="flex items-center gap-3.5 border-l-4 border-l-primary-500 p-4 shadow-xs">
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
          <Card className="flex items-center gap-3.5 border-l-4 border-l-emerald-500 p-4 shadow-xs">
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
          <Card className="flex items-center justify-between gap-3 border-l-4 border-l-amber-500 p-4 shadow-xs">
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
                className="shrink-0 text-xs text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 cursor-pointer"
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

      {/* Main Journal Table Content */}
      {loading || isRefetching ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-edge dark:bg-[#161a23]">
          <Spinner label="Jurnal ma’lumotlari yuklanmoqda..." />
        </div>
      ) : error || !data ? (
        <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />
      ) : !data.students.length ? (
        <EmptyState title="Bu sinfda o‘quvchilar yo‘q" hint="O‘quvchilar bo‘limidan sinfga o‘quvchi qo‘shing" />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-edge dark:bg-[#161a23]">
          {/* Quarter Header Indicator */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 bg-gray-50/90 px-4 py-3 text-xs dark:border-edge dark:bg-[#1e2330]">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                <ClipboardList size={15} />
              </span>
              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                {activeQuarter}-chorak jurnali · {quarterColumns.length} ta dars o‘tilgan
              </span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1.5">
              <Users size={13} className="text-primary-500" />
              O‘quvchi ismiga bosib to‘liq statistikasini ko‘rishingiz mumkin
            </span>
          </div>

          {/* Empty quarter state if no lessons conducted yet */}
          {quarterColumns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-[#161a23]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 mb-3 shadow-xs">
                <CalendarPlus size={28} />
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                {activeQuarter}-chorakda hali dars o‘tkazilmagan
              </h4>
              <p className="mt-1.5 max-w-md text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Ushbu chorak elektron jurnalida dars ustunini ochish va o‘quvchilarni baholash uchun quyidagi tugmani bosing.
              </p>
              {canGrade && (
                <button
                  type="button"
                  onClick={openColModal}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary-500/25 hover:bg-primary-500 transition-all cursor-pointer"
                >
                  <CalendarPlus size={15} />
                  <span>{activeQuarter}-chorak uchun dars o‘tish</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-sm border-collapse bg-white dark:bg-[#161a23]">
                <thead>
                  <tr className="border-b border-gray-200 text-left bg-gray-100/80 dark:border-edge dark:bg-[#1c212c]">
                    {/* Sticky Student Column Header (100% Solid background, shadow, border) */}
                    <th className="sticky left-0 z-20 min-w-56 border-r border-gray-200 bg-white px-4 py-3.5 font-bold text-gray-800 shadow-[3px_0_10px_-3px_rgba(0,0,0,0.08)] dark:border-edge dark:bg-[#161a23] dark:text-gray-200">
                      O‘quvchi (F.I.SH)
                    </th>

                    {/* Render Conducted Lesson Columns for this quarter */}
                    {quarterColumns.map((col) => {
                      const lesson = lessonsById.get(col.lessonId)
                      const isControl = isControlLesson(col, lesson)

                      return (
                        <th
                          key={col.id}
                          className={cn(
                            'relative px-3 py-2.5 text-center align-bottom transition-colors min-w-28 border-r border-gray-200 dark:border-edge',
                            isControl
                              ? 'bg-purple-500/10 border-x border-purple-200 dark:bg-purple-950/40 dark:border-purple-800/50'
                              : 'bg-gray-50/50 dark:bg-[#1c212c]/60',
                          )}
                        >
                          {/* Oraliq nazorat badge */}
                          {isControl && (
                            <span className="mb-1 inline-flex items-center gap-1 rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                              <FileCheck size={10} /> Oraliq nazorat
                            </span>
                          )}

                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={cn(
                                'block text-xs font-bold whitespace-nowrap tabular-nums',
                                isControl ? 'text-purple-900 dark:text-purple-200' : 'text-gray-900 dark:text-gray-100',
                              )}
                            >
                              {formatDateShort(col.date)}
                            </span>

                            {/* Cancel / Delete Column action button */}
                            {canGrade && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingCol(col)
                                  setDeletingColError(null)
                                }}
                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer transition-colors"
                                title="Darsni bekor qilish / o‘chirish"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>

                          <span
                            className="mx-auto mt-0.5 block max-w-28 truncate text-[11px] font-medium text-gray-500 dark:text-gray-400"
                            title={lessonTitle(col.lessonId)}
                          >
                            {lessonTitle(col.lessonId)}
                          </span>
                        </th>
                      )
                    })}

                    {/* Average Grade Column */}
                    <th className="px-4 py-3.5 text-center font-bold text-gray-800 dark:text-gray-200 min-w-24 bg-gray-50/80 dark:bg-[#1c212c]">
                      O‘rtacha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s) => {
                    const studentStat = studentQuarterStats.get(s.id)
                    const avg = studentStat?.avg ?? '—'
                    const isLeader = activeClass?.leaderId === s.id

                    return (
                      <tr
                        key={s.id}
                        className="group border-b border-gray-200/80 transition-colors hover:bg-primary-50/50 dark:border-edge/70 dark:hover:bg-[#202636]"
                      >
                        {/* Sticky Student Column Cell (Solid background, full row hover sync, clickable profile) */}
                        <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-4 py-2.5 shadow-[3px_0_10px_-3px_rgba(0,0,0,0.08)] group-hover:bg-primary-50/60 dark:border-edge dark:bg-[#161a23] dark:group-hover:bg-[#202636] transition-colors">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setInspectStudent(s)}
                              className="cursor-pointer transition-transform hover:scale-105"
                              title="O‘quvchi profili"
                            >
                              <Avatar name={s.name} size="sm" />
                            </button>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                onClick={() => setInspectStudent(s)}
                                className="font-semibold whitespace-nowrap text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400 cursor-pointer transition-colors hover:underline text-sm"
                                title="Statistika va yutuqlarini ko‘rish uchun bosing"
                              >
                                {s.name}
                              </span>
                              {isLeader && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300 shrink-0"
                                  title="Sinf sardori"
                                >
                                  <Crown size={11} className="fill-amber-500 text-amber-500" />
                                  Sardor
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Lesson Cells */}
                        {quarterColumns.map((col) => {
                          const entry = entryMap.get(`${s.id}:${col.date}`)
                          const hasIssue = entry?.needsWork
                          const lesson = lessonsById.get(col.lessonId)
                          const isControl = isControlLesson(col, lesson)

                          return (
                            <td
                              key={col.id}
                              className={cn(
                                'px-2.5 py-2 text-center transition-colors border-r border-gray-200/70 dark:border-edge/60 group-hover:bg-primary-50/30 dark:group-hover:bg-[#202636]/60',
                                isControl && 'bg-purple-500/5 dark:bg-purple-950/20 border-x border-purple-200/60 dark:border-purple-800/40',
                              )}
                            >
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
                                  'group/btn relative inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-bold transition-all',
                                  canGrade && 'cursor-pointer hover:scale-110 hover:shadow-md',
                                  entry?.attendance === 'sababli'
                                    ? 'border border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold shadow-xs'
                                    : entry?.attendance === 'kelmadi' || entry?.attendance === 'sababsiz'
                                      ? 'border border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-300 font-bold shadow-xs'
                                      : entry?.grade
                                        ? cn(GRADE_TONES[entry.grade], 'border border-current/20 shadow-xs')
                                        : hasIssue
                                          ? 'border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                                          : entry?.attendance === 'keldi'
                                            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                                            : canGrade
                                              ? 'border border-dashed border-gray-300 bg-gray-50/80 text-gray-400 hover:border-primary-400 hover:bg-primary-50/50 hover:text-primary-600 dark:border-gray-600/80 dark:bg-white/5 dark:text-gray-400 dark:hover:border-primary-400 dark:hover:bg-primary-500/20 dark:hover:text-primary-300'
                                              : 'border border-transparent text-gray-300 dark:text-gray-600',
                                )}
                                title={
                                  entry
                                    ? `${entry.attendance === 'sababli' ? `Sababli kelmagan${entry.note ? ` (${entry.note})` : ''}` : entry.attendance === 'sababsiz' || entry.attendance === 'kelmadi' ? 'Sababsiz kelmagan' : entry.grade ? `${entry.grade}-baho` : entry.attendance === 'kechikdi' ? 'Kechikkan (+1 ball)' : 'Darsda qatnashgan (+2 ball)'}${hasIssue ? ` · Kamchilik: ${entry.note || 'Keyingi darsda so‘ralsin'}` : ''}`
                                    : canGrade
                                      ? 'Baho yoki davomat qo‘yish uchun bosing'
                                      : 'Belgilanmagan'
                                }
                              >
                                {entry?.attendance === 'sababli' ? (
                                  <span className="text-[11px] font-black">Sb</span>
                                ) : entry?.attendance === 'kelmadi' || entry?.attendance === 'sababsiz' ? (
                                  <X size={13} strokeWidth={2.5} />
                                ) : entry?.grade ? (
                                  entry.grade
                                ) : hasIssue ? (
                                  <AlertCircle size={13} className="text-amber-500" />
                                ) : entry?.attendance === 'keldi' ? (
                                  <Check size={13} className="text-emerald-500" />
                                ) : canGrade ? (
                                  <span className="opacity-40 group-hover/btn:opacity-100 transition-opacity text-sm font-semibold">+</span>
                                ) : (
                                  '—'
                                )}

                                {entry?.attendance === 'kechikdi' && <Clock3 size={11} className="opacity-70" />}

                                {/* Corner issue indicator */}
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

                        {/* Average Grade Cell */}
                        <td className="px-4 py-2.5 text-center font-bold text-gray-900 tabular-nums dark:text-white group-hover:bg-primary-50/50 dark:group-hover:bg-[#202636] transition-colors text-sm">
                          {avg}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend Bar */}
          <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 bg-gray-50/80 px-4 py-3 text-xs text-gray-600 dark:border-edge dark:bg-[#1c212c] dark:text-gray-300">
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
            <span className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
              <FileCheck size={13} /> Oraliq nazorat (BSB/ChSB)
            </span>
            {canGrade && <span className="ml-auto hidden sm:inline text-gray-400">Katakchani bosib tezkor baho yoki davomat belgilang</span>}
          </div>
        </div>
      )}

      {/* Grade / attendance / issues cell editor modal */}
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

              {/* Attendance Selection Buttons */}
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

              {/* Sababli kelmagan bo'lsa izoh */}
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
                        className="rounded-md border border-sky-200 bg-white/90 px-2 py-0.5 text-xs text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-surface dark:text-sky-300 cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Baho qo'yish tugmalari */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    Darsdagi bahosi
                  </label>
                  {cellGrade && !isAbsent && (
                    <button
                      type="button"
                      onClick={() => setCellGrade('')}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X size={12} />
                      <span>Bahoni tozalash</span>
                    </button>
                  )}
                </div>

                {isAbsent ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-3.5 text-center text-xs text-gray-500 dark:border-edge dark:bg-surface-2 dark:text-gray-400">
                    <AlertCircle size={14} className="text-amber-500 shrink-0" />
                    <span>O‘quvchi darsga kelmagan deb belgilanganda baho qo‘yilmaydi.</span>
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
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-emerald-600 shadow-xs">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Kamchilik bor / Keyingi darsda so'ralsin */}
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
                            className="rounded-md border border-gray-200 bg-white/80 px-2 py-0.5 text-xs text-gray-600 transition-colors hover:border-amber-400 hover:text-amber-600 dark:border-edge dark:bg-surface/80 dark:text-gray-300 cursor-pointer"
                          >
                            {preset}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setCell(null)}>
                  Bekor qilish
                </Button>
                {/* Instant Save with 0ms delay */}
                <Button onClick={saveCell}>
                  Tezkor saqlash
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
              Sinf sardori davomat va sinf intizomida sinf rahbariga ko‘makchi bo‘ladi.
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

      {/* New conducted lesson Column Modal (Requirements 2, 5, 9, 11) */}
      <Modal open={colModal} title="Dars o‘tish — mavzuni tanlang" onClose={() => setColModal(false)}>
        <form onSubmit={addColumn} className="flex flex-col gap-4">
          <Field label="Sana">
            <Input type="date" value={colDate} onChange={(e) => setColDate(e.target.value)} required />
          </Field>

          {/* Dars turi (Requirement 9: Oraliq nazorat) */}
          <Field label="Dars mashg‘uloti turi">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setColLessonType('standard')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer',
                  colLessonType === 'standard'
                    ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:border-primary-400 dark:text-primary-300 ring-2 ring-primary-500/20'
                    : 'border-gray-200 bg-white/70 text-gray-600 hover:bg-gray-50 dark:border-edge dark:bg-surface-2 dark:text-gray-400',
                )}
              >
                <BookOpen size={15} />
                <span>Oddiy dars</span>
              </button>
              <button
                type="button"
                onClick={() => setColLessonType('control')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer',
                  colLessonType === 'control'
                    ? 'border-purple-500 bg-purple-500/15 text-purple-700 dark:border-purple-400 dark:text-purple-300 ring-2 ring-purple-500/30'
                    : 'border-gray-200 bg-white/70 text-gray-600 hover:bg-gray-50 dark:border-edge dark:bg-surface-2 dark:text-gray-400',
                )}
              >
                <FileCheck size={15} />
                <span>Oraliq nazorat (BSB/ChSB)</span>
              </button>
            </div>
          </Field>

          {/* Topic Combobox with live search (Requirement 2) */}
          <Field label="O‘tiladigan mavzu">
            <TopicCombobox
              lessons={activeQuarterLessons}
              value={colLesson}
              onChange={setColLesson}
              placeholder="Mavzuni qidiring yoki tanlang..."
            />
          </Field>

          <p className="text-xs text-gray-400">
            {activeQuarter}-chorak bo‘yicha yangi dars ustuni ochiladi va o‘quvchilar avtomatik darsda qatnashgan deb belgilanadi.
          </p>

          {saveColError && <p className="text-sm text-red-500">{saveColError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setColModal(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={savingCol || !colLesson}>
              {savingCol ? 'Ochilmoqda...' : 'Darsni boshlash'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete/Cancel Conducted Lesson Modal (Requirement 11) */}
      <Modal
        open={deletingCol !== null}
        title="Darsni bekor qilish"
        onClose={() => setDeletingCol(null)}
      >
        {deletingCol && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Haqiqatan ham <strong className="text-gray-900 dark:text-white">{formatDateShort(deletingCol.date)}</strong> sanasidagi darsni ({lessonTitle(deletingCol.lessonId)}) jurnalidan bekor qilmoqchimisiz?
            </p>
            <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold">
              <AlertCircle size={14} className="shrink-0" />
              <span>Ushbu dars uchun qo‘yilgan baho va davomat ma’lumotlari ham o‘chiriladi.</span>
            </p>
            {deletingColError && <p className="text-xs font-semibold text-red-500">{deletingColError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDeletingCol(null)}>
                Bekor qilish
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteColumn}
                disabled={deletingColLoading}
              >
                {deletingColLoading ? 'Bekor qilinmoqda...' : 'Darsni bekor qilish'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Student Profile / Statistics Modal (Requirement 8 & 10) */}
      {inspectStudent && (
        <StudentProfileModal
          student={inspectStudent}
          position={0}
          classLabel={activeClass ? `${activeClass.grade}-«${activeClass.letter}»` : ''}
          badgeDefs={badgeDefs}
          onClose={() => setInspectStudent(null)}
          onStudentUpdated={() => reload()}
        />
      )}
    </div>
  )
}
