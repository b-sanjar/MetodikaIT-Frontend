import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Clock, Play, Plus, Sparkles, Trash2, UserRound } from 'lucide-react'
import type { Lesson } from '../types'
import * as api from '../services/api'
import { QUARTER_NAMES } from '../data/curriculum'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { Field, Input, Select } from '../components/Field'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import { cn } from '../utils/cn'

export default function GradeDetailPage() {
  const { grade: gradeParam } = useParams()
  const grade = Number(gradeParam)
  const navigate = useNavigate()
  const { canTeach, isAdmin, user } = useAuth()
  const [quarter, setQuarter] = useState(1)
  const [selectedSubject, setSelectedSubject] = useState<string>('all')

  const [addModal, setAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newQuarter, setNewQuarter] = useState(1)
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
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">
                      {lesson.title}
                    </h3>
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
      <Modal open={addModal} title={`${grade}-sinfga yangi dars`} onClose={() => setAddModal(false)}>
        <form onSubmit={submitAdd} className="flex flex-col gap-4">
          <Field label="Dars mavzusi *">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Masalan: Scratchda animatsiya yaratish"
              required
              autoFocus
            />
          </Field>

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
            <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              Sizga hali birorta fan biriktirilmagan. Dars qo‘shish uchun administratorga murojaat qiling.
            </div>
          )}

          <Field label="Chorak">
            <Select value={newQuarter} onChange={(e) => setNewQuarter(Number(e.target.value))}>
              {QUARTER_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>

          <p className="text-xs text-gray-400">
            Ishlanma shabloni (maqsad, nazariya, amaliyot, uy vazifasi) avtomatik yaratiladi — keyin dars sahifasida
            tahrirlaysiz. Yangi dars «Qoralama» holatida ochiladi.
          </p>

          {saveError && <p className="text-sm text-red-500">{saveError}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAddModal(false)}>
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={saving || (!isAdmin && teacherAssignedSubjects.length === 0)}
            >
              {saving ? 'Yaratilmoqda...' : 'Yaratish va ochish'}
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
