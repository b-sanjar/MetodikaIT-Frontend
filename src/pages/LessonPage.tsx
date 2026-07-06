import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  FileDown,
  Home,
  ListChecks,
  MonitorPlay,
  Pencil,
  Presentation,
  Trash2,
  UserRound,
  Video,
  Wrench,
} from 'lucide-react'
import * as api from '../services/api'
import { QUARTER_NAMES } from '../data/curriculum'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import { formatDateLong, todayISO } from '../utils/format'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Modal from '../components/Modal'
import { Field, Input, Select, Textarea } from '../components/Field'
import { ErrorState, Spinner } from '../components/States'
import type { Lesson, LessonStatus } from '../types'
import type { ReactNode } from 'react'

interface EditState {
  title: string
  objective: string
  theory: string
  practice: string
  homework: string
  equipment: string
  outcomes: string
  durationMin: string
  status: LessonStatus
}

const toLines = (arr: string[]) => arr.join('\n')
const fromLines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

function editStateFrom(lesson: Lesson): EditState {
  return {
    title: lesson.title,
    objective: lesson.objective,
    theory: toLines(lesson.theory),
    practice: toLines(lesson.practice),
    homework: lesson.homework,
    equipment: toLines(lesson.equipment),
    outcomes: toLines(lesson.outcomes),
    durationMin: String(lesson.durationMin),
    status: lesson.status,
  }
}

/** Print-only lesson document — the browser's "Save as PDF" renders this layout. */
function PrintDoc({ lesson }: { lesson: Lesson }) {
  const sections: { num: string; title: string; body: ReactNode }[] = [
    {
      num: '01',
      title: 'Dars maqsadi',
      body: (
        <div className="pd-callout">
          <p>{lesson.objective}</p>
        </div>
      ),
    },
    {
      num: '02',
      title: 'Nazariy qism',
      body: (
        <div className="pd-prose">
          {lesson.theory.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ),
    },
    {
      num: '03',
      title: 'Amaliy topshiriqlar',
      body: (
        <ol className="pd-list">
          {lesson.practice.map((p, i) => (
            <li key={i}>
              <span className="pd-num">{i + 1}</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      ),
    },
    {
      num: '04',
      title: 'Uy vazifasi',
      body: (
        <div className="pd-callout pd-callout--amber">
          <p>{lesson.homework}</p>
        </div>
      ),
    },
  ]

  return (
    <article className="print-doc hidden print:block">
      <header>
        <div className="pd-brand">
          <span className="pd-logo">IT</span>
          <div>
            <p className="pd-brand-name">Metodika IT</p>
            <p className="pd-brand-sub">Informatika fanidan dars ishlanmasi</p>
          </div>
          <span className="pd-date">{formatDateLong(todayISO())}</span>
        </div>
        <h1 className="pd-title">{lesson.title}</h1>
        <div className="pd-meta">
          {[
            ['Sinf', `${lesson.grade}-sinf`],
            ['Chorak', QUARTER_NAMES[lesson.quarter - 1]],
            ['Dars tartibi', `${lesson.order}-dars`],
            ['Davomiyligi', `${lesson.durationMin} daqiqa`],
            ['Muallif', lesson.authorName],
            ['Holati', lesson.status === 'ready' ? 'Tayyor ishlanma' : 'Qoralama'],
          ].map(([label, value]) => (
            <div key={label} className="pd-meta-cell">
              <p className="pd-meta-label">{label}</p>
              <p className="pd-meta-value">{value}</p>
            </div>
          ))}
        </div>
      </header>

      {sections.map((s) => (
        <section key={s.num} className="pd-section">
          <div className="pd-sec-head">
            <span className="pd-sec-num">{s.num}</span>
            <h2 className="pd-sec-title">{s.title}</h2>
          </div>
          {s.body}
        </section>
      ))}

      <div className="pd-cols">
        <div className="pd-panel">
          <h3 className="pd-panel-title">Kerakli jihozlar</h3>
          <ul className="pd-list">
            {lesson.equipment.map((e) => (
              <li key={e}>
                <span className="pd-dot" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="pd-panel">
          <h3 className="pd-panel-title">Kutilgan natijalar</h3>
          <ul className="pd-list">
            {lesson.outcomes.map((o) => (
              <li key={o}>
                <span className="pd-check">✓</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="pd-foot">
        <span>Metodika IT platformasida tayyorlandi</span>
        <span>
          {lesson.grade}-sinf · {QUARTER_NAMES[lesson.quarter - 1]} · {lesson.order}-dars
        </span>
      </footer>
    </article>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-gray-900 dark:text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:text-primary-400">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </Card>
  )
}

export default function LessonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canTeach, isAdmin, user } = useAuth()
  const { data: lesson, loading, error, reload, setData } = useFetch(() => api.getLesson(id!), [id])

  const [videoModal, setVideoModal] = useState(false)
  const [videoInput, setVideoInput] = useState('')
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (loading) return <Spinner />
  if (error || !lesson) return <ErrorState message={error ?? 'Dars topilmadi'} onRetry={reload} />

  const canDelete = isAdmin || user?.id === lesson.authorId

  const confirmDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.deleteLesson(lesson.id)
      navigate(`/darslar/${lesson.grade}`)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'O‘chirishda xatolik')
      setDeleting(false)
    }
  }

  // Print in light theme regardless of the current mode, then restore.
  // The browser dialog's "Save as PDF" destination produces the PDF file.
  const printLesson = () => {
    const wasDark = document.documentElement.classList.contains('dark')
    if (wasDark) document.documentElement.classList.remove('dark')
    window.print()
    if (wasDark) document.documentElement.classList.add('dark')
  }

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!edit) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await api.updateLesson(lesson.id, {
        title: edit.title.trim(),
        objective: edit.objective.trim(),
        theory: fromLines(edit.theory),
        practice: fromLines(edit.practice),
        homework: edit.homework.trim(),
        equipment: fromLines(edit.equipment),
        outcomes: fromLines(edit.outcomes),
        durationMin: Math.max(1, Number(edit.durationMin) || 45),
        status: edit.status,
      })
      setData(() => updated)
      setEdit(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  const saveVideo = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await api.updateLesson(lesson.id, { videoUrl: videoInput.trim() })
      setData(() => updated)
      setVideoModal(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-rise print:animate-none">
      <PrintDoc lesson={lesson} />

      <div className="print:hidden">
      <Link
        to={`/darslar/${lesson.grade}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-300"
      >
        <ArrowLeft size={15} /> {lesson.grade}-sinf darslari
      </Link>

      {/* Lesson hero */}
      <Card className="relative mb-6 overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl"
        />
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Chip tone="primary">{lesson.grade}-sinf</Chip>
            <Chip tone="gray">{QUARTER_NAMES[lesson.quarter - 1]}</Chip>
            <Chip tone="gray">{lesson.order}-dars</Chip>
            <Chip tone={lesson.status === 'ready' ? 'green' : 'amber'} dot>
              {lesson.status === 'ready' ? 'Tayyor ishlanma' : 'Qoralama'}
            </Chip>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
            {lesson.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-2">
              <Clock size={15} /> {lesson.durationMin} daqiqalik dars
            </span>
            {isAdmin && (
              <span className="flex items-center gap-2" title="Dars muallifi">
                <UserRound size={15} /> Muallif: {lesson.authorName}
              </span>
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="lg" onClick={() => navigate(`/dars/${lesson.id}/taqdimot`)}>
              <Presentation size={18} /> Taqdimotni boshlash
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={printLesson}
              title="Ochilgan oynada «PDF sifatida saqlash»ni tanlang"
            >
              <FileDown size={18} /> PDF sifatida saqlash
            </Button>
            {canTeach && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setEdit(editStateFrom(lesson))
                  setSaveError(null)
                }}
              >
                <Pencil size={18} /> Tahrirlash
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                size="lg"
                onClick={() => {
                  setDeleteError(null)
                  setDeleteModal(true)
                }}
              >
                <Trash2 size={18} /> O‘chirish
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Section icon={<CheckCircle2 size={16} />} title="Dars maqsadi">
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{lesson.objective}</p>
          </Section>

          <Section icon={<BookOpen size={16} />} title="Nazariy qism">
            <div className="flex flex-col gap-3">
              {lesson.theory.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {p}
                </p>
              ))}
            </div>
          </Section>

          <Section icon={<ListChecks size={16} />} title="Amaliy topshiriqlar">
            <ol className="flex flex-col gap-3">
              {lesson.practice.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-xs font-semibold text-primary-600 dark:text-primary-300">
                    {i + 1}
                  </span>
                  {p}
                </li>
              ))}
            </ol>
          </Section>

          <Section icon={<Home size={16} />} title="Uy vazifasi">
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{lesson.homework}</p>
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          <Section icon={<Video size={16} />} title="Video material">
            {lesson.videoUrl ? (
              <div className="flex flex-col gap-3">
                <a
                  href={lesson.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm font-medium text-primary-600 transition-colors hover:border-primary-400 dark:border-edge dark:text-primary-300 dark:hover:border-primary-500/60"
                >
                  <MonitorPlay size={18} /> Videoni ochish
                </a>
                <p className="truncate text-xs text-gray-400">{lesson.videoUrl}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">Video hali biriktirilmagan.</p>
            )}
            {canTeach && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setVideoInput(lesson.videoUrl)
                  setSaveError(null)
                  setVideoModal(true)
                }}
              >
                <Pencil size={14} /> {lesson.videoUrl ? 'Havolani o‘zgartirish' : 'Video biriktirish'}
              </Button>
            )}
          </Section>

          <Section icon={<Wrench size={16} />} title="Kerakli jihozlar">
            <ul className="flex flex-col gap-2">
              {lesson.equipment.map((e) => (
                <li key={e} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" /> {e}
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={<CheckCircle2 size={16} />} title="Kutilgan natijalar">
            <ul className="flex flex-col gap-2.5">
              {lesson.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" /> {o}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <Modal open={edit !== null} title="Dars ishlanmasini tahrirlash" onClose={() => setEdit(null)} wide>
        {edit && (
          <form onSubmit={saveEdit} className="flex flex-col gap-4">
            <Field label="Dars mavzusi">
              <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required />
            </Field>
            <Field label="Dars maqsadi">
              <Textarea
                value={edit.objective}
                onChange={(e) => setEdit({ ...edit, objective: e.target.value })}
                required
              />
            </Field>
            <Field label="Nazariy qism (har bir abzats — alohida qator)">
              <Textarea
                value={edit.theory}
                onChange={(e) => setEdit({ ...edit, theory: e.target.value })}
                className="min-h-40"
                required
              />
            </Field>
            <Field label="Amaliy topshiriqlar (har bir topshiriq — alohida qator)">
              <Textarea
                value={edit.practice}
                onChange={(e) => setEdit({ ...edit, practice: e.target.value })}
                required
              />
            </Field>
            <Field label="Uy vazifasi">
              <Textarea
                value={edit.homework}
                onChange={(e) => setEdit({ ...edit, homework: e.target.value })}
                required
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Kerakli jihozlar (har biri — alohida qator)">
                <Textarea
                  value={edit.equipment}
                  onChange={(e) => setEdit({ ...edit, equipment: e.target.value })}
                />
              </Field>
              <Field label="Kutilgan natijalar (har biri — alohida qator)">
                <Textarea
                  value={edit.outcomes}
                  onChange={(e) => setEdit({ ...edit, outcomes: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Dars davomiyligi (daqiqa)">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={edit.durationMin}
                  onChange={(e) => setEdit({ ...edit, durationMin: e.target.value })}
                />
              </Field>
              <Field label="Holati">
                <Select
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value as LessonStatus })}
                >
                  <option value="ready">Tayyor ishlanma</option>
                  <option value="draft">Qoralama</option>
                </Select>
              </Field>
            </div>
            {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setEdit(null)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={videoModal} title="Video material havolasi" onClose={() => setVideoModal(false)}>
        <form onSubmit={saveVideo} className="flex flex-col gap-4">
          <Field label="Video URL (YouTube, disk va h.k.)">
            <Input
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </Field>
          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setVideoModal(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteModal} title="Darsni o‘chirish" onClose={() => setDeleteModal(false)}>
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            «{lesson.title}» darsini butunlay o‘chirmoqchimisiz? Bu amalni qaytarib bo‘lmaydi.
          </p>
          {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setDeleteModal(false)}>
              Bekor qilish
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              <Trash2 size={15} /> {deleting ? 'O‘chirilmoqda...' : 'O‘chirish'}
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  )
}
