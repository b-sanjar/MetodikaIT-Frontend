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

  const [addModal, setAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newQuarter, setNewQuarter] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [toDelete, setToDelete] = useState<Lesson | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, loading, error, reload } = useFetch(async () => {
    const [lessons, quarters] = await Promise.all([api.getLessonsByGrade(grade), api.getQuarterInfos(grade)])
    return { lessons, quarters }
  }, [grade])

  if (loading) return <Spinner />
  if (error || !data) return <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />
  if (!data.lessons.length && !canTeach)
    return <EmptyState title={`${grade}-sinf uchun darslar topilmadi`} hint="Sinf raqamini tekshiring" />

  const lessons = data.lessons.filter((l) => l.quarter === quarter)
  const skills = data.quarters.find((q) => q.quarter === quarter)?.skills ?? []

  const openAdd = () => {
    setNewTitle('')
    setNewQuarter(quarter)
    setSaveError(null)
    setAddModal(true)
  }

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const lesson = await api.addLesson({ grade, quarter: newQuarter, title: newTitle.trim() })
      navigate(`/dars/${lesson.id}`)
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
        to="/darslar"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-300"
      >
        <ArrowLeft size={15} /> Barcha sinflar
      </Link>

      <PageHeader
        title={`${grade}-sinf informatika`}
        subtitle={`${data.lessons.length} ta dars ishlanmasi · 4 chorak bo‘yicha taqsimlangan`}
        actions={
          canTeach && (
            <Button onClick={openAdd}>
              <Plus size={16} /> Dars qo‘shish
            </Button>
          )
        }
      />

      {/* Quarter tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 dark:border-edge dark:bg-surface">
        {QUARTER_NAMES.map((name, i) => (
          <button
            key={name}
            onClick={() => setQuarter(i + 1)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
              quarter === i + 1
                ? 'bg-linear-to-b from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30 ring-1 ring-white/20 ring-inset'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100',
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lessons */}
        <div className="stagger flex flex-col gap-3 lg:col-span-2">
          {lessons.length === 0 && (
            <EmptyState
              title="Bu chorakda hali dars yo‘q"
              hint="«Dars qo‘shish» tugmasi orqali birinchi darsni yarating"
            />
          )}
          {lessons.map((lesson) => (
            <Link key={lesson.id} to={`/dars/${lesson.id}`}>
              <Card hover className="group flex items-center gap-4 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-sm font-semibold text-primary-600 dark:text-primary-300">
                  {lesson.order}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">
                    {lesson.title}
                  </h3>
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

      {/* New lesson */}
      <Modal open={addModal} title={`${grade}-sinfga yangi dars`} onClose={() => setAddModal(false)}>
        <form onSubmit={submitAdd} className="flex flex-col gap-4">
          <Field label="Dars mavzusi">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Masalan: Scratchda animatsiya yaratish"
              required
              autoFocus
            />
          </Field>
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
            <Button type="submit" disabled={saving}>
              {saving ? 'Yaratilmoqda...' : 'Yaratish va ochish'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={toDelete !== null} title="Darsni o‘chirish" onClose={() => setToDelete(null)}>
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            «{toDelete?.title}» darsini butunlay o‘chirmoqchimisiz? Bu amalni qaytarib bo‘lmaydi.
          </p>
          {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setToDelete(null)}>
              Bekor qilish
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              <Trash2 size={15} /> {deleting ? 'O‘chirilmoqda...' : 'O‘chirish'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
