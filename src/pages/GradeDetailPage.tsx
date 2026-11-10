import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronRight, Clock, FileCheck, Play, Plus, Sparkles, Trash2, UserRound } from 'lucide-react'
import type { Lesson, LessonType } from '../types'
import * as api from '../services/api'
import { QUARTER_NAMES } from '../data/curriculum'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import { useQuarter } from '../context/QuarterContext'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { Field, Input, Select } from '../components/Field'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import { cn } from '../utils/cn'

export default function GradeDetailPage() {
  const params = useParams()
  const gradeParam = params.grade || params.slug
  const grade = Number(gradeParam)
  const navigate = useNavigate()
  const { canTeach, isAdmin, user } = useAuth()
  const { quarter, setQuarter } = useQuarter()
  const [selectedSubject, setSelectedSubject] = useState<string>('all')

  const [addModal, setAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newQuarter, setNewQuarter] = useState(quarter)
  const [newLessonType, setNewLessonType] = useState<LessonType>('standard')
  const [newSubjectId, setNewSubjectId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [toDelete, setToDelete] = useState<Lesson | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, loading, error, reload } = useFetch(async () => {
    const [lessons, quarters, subjects] = await Promise.all([
      api.getLessonsByGrade(grade),
      api.getQuarterInfos(grade),
      api.getSubjects(),
    ])
    return { lessons, quarters, subjects }
  }, [grade])

  if (loading) return <Spinner />
  if (error || !data) return <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />
  if (!data.lessons.length && !canTeach)
    return <EmptyState title={`${grade}-sinf uchun darslar topilmadi`} hint="Sinf raqamini tekshiring" />

  // Determine teacher's assigned subjects
  const teacherSubjectIds = Array.isArray(user?.subjectIds) && user.subjectIds.length
    ? user.subjectIds
    : user?.subjectId
      ? [user.subjectId]
      : []

  const teacherAssignedSubjects = data.subjects.filter((s) => teacherSubjectIds.includes(s.id))

  // Filter lessons by quarter and optionally by subject
  const lessons = data.lessons.filter((l) => {
    const matchesQuarter = l.quarter === quarter
    const matchesSubject = selectedSubject === 'all' || l.subjectId === selectedSubject
    return matchesQuarter && matchesSubject
  })

  const skills = data.quarters.find((q) => q.quarter === quarter)?.skills ?? []

  const openAdd = () => {
    setNewTitle('')
    setNewQuarter(quarter)
    setNewLessonType('standard')
    setSaveError(null)

    if (isAdmin) {
      setNewSubjectId(data.subjects[0]?.id || '')
    } else {
      // For teacher: default to their first assigned subject
      setNewSubjectId(teacherAssignedSubjects[0]?.id || '')
    }

    setAddModal(true)
  }

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    // Validation for teacher
    if (!isAdmin && !teacherAssignedSubjects.length) {
      setSaveError('Sizga birorta fan biriktirilmagan. Administratorga murojaat qiling.')
      setSaving(false)
      return
    }

    const resolvedSubId = !isAdmin && teacherAssignedSubjects.length === 1
      ? teacherAssignedSubjects[0].id
      : newSubjectId

    try {
      const lesson = await api.addLesson({
        grade,
        quarter: newQuarter,
        title: newTitle.trim(),
        subjectId: resolvedSubId || null,
        lessonType: newLessonType,
      })
      navigate(`/lessons/${lesson.id}`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Saqlashda xatolik')
      setSaving(false)
    }
  }

  const canDelete = (lesson: Lesson) => isAdmin || user?.id === lesson.authorId

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.deleteLesson(toDelete.id)
      setToDelete(null)
      reload()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'O‘chirishda xatolik')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="animate-rise">
      <Link
        to="/lessons"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-300"
      >
        <ArrowLeft size={15} /> Barcha sinflar
      </Link>

      <PageHeader
        title={`${grade}-sinf darslari`}
        subtitle={`${data.lessons.length} ta dars ishlanmasi · 4 chorak bo‘yicha taqsimlangan`}
        actions={
          canTeach && (
            <Button onClick={openAdd}>
              <Plus size={16} /> Dars qo‘shish
            </Button>
          )
        }
      />

      {/* Fanlar bo'yicha filter tugmalari */}
      {data.subjects.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedSubject('all')}
            className={cn(
              'rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer shadow-xs',
              selectedSubject === 'all'
                ? 'bg-primary-500 text-white shadow-primary-500/25'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-400 dark:border-edge dark:bg-surface dark:text-gray-300'
            )}
          >
            Barcha fanlar
          </button>
          {data.subjects.map((sub) => {
            const count = data.lessons.filter((l) => l.subjectId === sub.id && l.quarter === quarter).length
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubject(sub.id)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer shadow-xs',
                  selectedSubject === sub.id
                    ? 'bg-primary-500 text-white shadow-primary-500/25'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-400 dark:border-edge dark:bg-surface dark:text-gray-300'
                )}
              >
                {sub.name} {count > 0 ? `(${count})` : ''}
              </button>
            )
          })}
        </div>
      )}

      {/* Quarter tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 dark:border-edge dark:bg-surface">
        {QUARTER_NAMES.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => setQuarter(i + 1)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-center text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
              quarter === i + 1
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lesson list */}
        <div className="flex flex-col gap-2.5 lg:col-span-2">
          {!lessons.length && (
            <EmptyState
              title={selectedSubject === 'all' ? `${quarter}-chorakda darslar yo‘q` : `Tanlangan fan bo‘yicha ${quarter}-chorakda darslar yo‘q`}
              hint="«Dars qo‘shish» tugmasi orqali birinchi darsni yarating"
            />
          )}
          {lessons.map((lesson) => (
            <Link key={lesson.id} to={`/lessons/${lesson.id}`}>
              <Card hover className="group flex items-center gap-4 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-sm font-semibold text-primary-600 dark:text-primary-300">
                  {lesson.order}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">
                      {lesson.title}
                    </h3>
                    {(lesson.lessonType === 'control' ||
                      lesson.title.toLowerCase().includes('nazorat') ||
                      lesson.title.toLowerCase().includes('oraliq') ||
                      lesson.title.toLowerCase().includes('chsb') ||
                      lesson.title.toLowerCase().includes('bsb')) && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 shrink-0">
                        <FileCheck size={11} /> Oraliq nazorat
                      </span>
                    )}
                    {lesson.lessonType === 'practical' && (
                      <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300 shrink-0">
                        Amaliy ish
                      </span>
                    )}
                    {lesson.subjectName && (
                      <Chip tone="primary" className="text-[10px] shrink-0 font-medium">
                        {lesson.subjectName}
                      </Chip>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {lesson.durationMin} daqiqa
                    </span>
                    <span className="hidden items-center gap-1 sm:flex">
                      <Play size={12} /> Taqdimot tayyor
                    </span>
                    {isAdmin && (
                      <span
                        className="hidden items-center gap-1 text-primary-500/80 md:flex dark:text-primary-300/80"
                        title="Dars muallifi"
                      >
                        <UserRound size={12} /> {lesson.authorName}
                      </span>
                    )}
                  </p>
                </div>
                <Chip tone={lesson.status === 'ready' ? 'green' : 'amber'} dot className="hidden sm:inline-flex">
                  {lesson.status === 'ready' ? 'Tayyor' : 'Qoralama'}
                </Chip>
                {canDelete(lesson) && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setDeleteError(null)
                      setToDelete(lesson)
                    }}
                    aria-label="Darsni o‘chirish"
                    title="Darsni o‘chirish"
                    className="shrink-0 rounded-lg p-2 text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <ChevronRight size={16} className="shrink-0 text-gray-300 dark:text-gray-600" />
              </Card>
            </Link>
          ))}
        </div>

        {/* Quarter outcomes */}
        <Card className="h-fit p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Sparkles size={15} className="text-primary-500" /> Chorak yakunidagi ko‘nikmalar
          </h2>
          <p className="mb-4 text-xs text-gray-400">O‘quvchi ushbu chorakda egallashi kerak</p>
          <ul className="flex flex-col gap-2.5">
            {skills.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                {s}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* New lesson modal */}
      <Modal
        open={addModal}
        title={`${grade}-sinfga yangi dars yaratish`}
        subtitle="Yangi dars ishlanmasi, metodik reja va mavzuni tizimga kiritish"
        icon={<BookOpen size={22} />}
        onClose={() => setAddModal(false)}
        size="xl"
      >
        <form onSubmit={submitAdd} className="flex flex-col gap-5">
          <Field label="Dars mavzusi *">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Masalan: Scratchda o‘yin va animatsiya yaratish"
              required
              autoFocus
              className="font-medium text-base py-2.5"
            />
          </Field>

          {/* 2-column grid: Subject & Quarter */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Subject selection with role-based restriction */}
            {isAdmin ? (
              <Field label="Qaysi fanga tegishli? *">
                <Select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  required
                >
                  <option value="">Fan tanlang...</option>
                  {data.subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.code ? `(${sub.code})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : teacherAssignedSubjects.length === 1 ? (
              <Field label="Dars fani (biriktirilgan yagona fan)">
                <Input
                  value={teacherAssignedSubjects[0].name}
                  disabled
                  className="bg-gray-100 dark:bg-surface-2 cursor-not-allowed font-medium opacity-80"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Sizga biriktirilgan yagona fan bo‘yicha dars yaratiladi.
                </p>
              </Field>
            ) : teacherAssignedSubjects.length > 1 ? (
              <Field label="Qaysi fanga tegishli? *">
                <Select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  required
                >
                  <option value="">O‘z faningizni tanlang...</option>
                  {teacherAssignedSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.code ? `(${sub.code})` : ''}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px] text-gray-400">
                  O‘zingizga biriktirilgan fanlardan birini tanlang.
                </p>
              </Field>
            ) : (
              <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                Sizga hali birorta fan biriktirilmagan. Dars qo‘shish uchun administratorga murojaat qiling.
              </div>
            )}

            <Field label="O‘quv choragi *">
              <Select value={newQuarter} onChange={(e) => setNewQuarter(Number(e.target.value))}>
                {QUARTER_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Lesson Type selector (Requirement 9) */}
          <Field label="Dars mashg‘uloti turi *">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setNewLessonType('standard')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer shadow-xs',
                  newLessonType === 'standard'
                    ? 'border-primary-500 bg-primary-500/10 text-primary-700 dark:border-primary-400 dark:bg-primary-500/20 dark:text-primary-300 ring-2 ring-primary-500/30'
                    : 'border-gray-200 bg-white/70 text-gray-700 hover:border-gray-300 hover:bg-gray-50/80 dark:border-edge dark:bg-surface-2 dark:text-gray-300',
                )}
              >
                <span className="text-xs font-bold">Oddiy dars</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Nazariya va topshiriqlar</span>
              </button>

              <button
                type="button"
                onClick={() => setNewLessonType('control')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer shadow-xs',
                  newLessonType === 'control'
                    ? 'border-purple-500 bg-purple-500/15 text-purple-700 dark:border-purple-400 dark:bg-purple-950/40 dark:text-purple-300 ring-2 ring-purple-500/30'
                    : 'border-gray-200 bg-white/70 text-gray-700 hover:border-gray-300 hover:bg-gray-50/80 dark:border-edge dark:bg-surface-2 dark:text-gray-300',
                )}
              >
                <span className="text-xs font-bold">Oraliq nazorat</span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">BSB / ChSB</span>
              </button>

              <button
                type="button"
                onClick={() => setNewLessonType('practical')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer shadow-xs',
                  newLessonType === 'practical'
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-300 ring-2 ring-cyan-500/30'
                    : 'border-gray-200 bg-white/70 text-gray-700 hover:border-gray-300 hover:bg-gray-50/80 dark:border-edge dark:bg-surface-2 dark:text-gray-300',
                )}
              >
                <span className="text-xs font-bold">Amaliy ish</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Laboratoriya va mashqlar</span>
              </button>
            </div>
          </Field>

          <div className="rounded-xl border border-gray-200/80 bg-gray-50/70 p-3.5 text-xs text-gray-500 dark:border-edge dark:bg-surface-2/60 dark:text-gray-400 leading-relaxed">
            Dars ishlanmasi shabloni (maqsad, kutilayotgan natijalar, nazariya, amaliyot va uy vazifasi) avtomatik shakllantiriladi — keyinchalik dars sahifasida mustaqil tahrirlashingiz mumkin.
          </div>

          {saveError && (
            <div className="rounded-xl border border-red-500/30 bg-red-50/80 p-3 text-xs font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-950/40 dark:text-red-300">
              {saveError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-edge">
            <Button variant="ghost" type="button" onClick={() => setAddModal(false)}>
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={saving || (!isAdmin && teacherAssignedSubjects.length === 0)}
              className="shadow-sm"
            >
              <BookOpen size={16} className="mr-1.5" />
              {saving ? 'Yaratilmoqda...' : 'Yaratish va darsni ochish'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={toDelete !== null} title="Darsni o‘chirish" onClose={() => setToDelete(null)}>
        {toDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Haqiqatan ham <strong className="text-gray-900 dark:text-white">{toDelete.title}</strong> darsini
              o‘chirmoqchimisiz?
            </p>
            {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setToDelete(null)}>
                Bekor qilish
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'O‘chirilmoqda...' : 'O‘chirish'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
