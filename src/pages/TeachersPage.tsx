import { useState, type FormEvent } from 'react'
import { Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks/useFetch'
import * as api from '../services/api'
import type { Teacher } from '../types'
import { cn } from '../utils/cn'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import { Field, Input, Select } from '../components/Field'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, Spinner } from '../components/States'

interface FormState {
  id?: string
  name: string
  phone: string
  email: string
  classIds: string[]
  login: string
  password: string
  subjectId: string
}

export default function TeachersPage() {
  const { isAdmin } = useAuth()
  const [form, setForm] = useState<FormState | null>(null)
  const [removing, setRemoving] = useState<Teacher | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string>('all')

  const { data, loading, error, reload } = useFetch(async () => {
    const [teachers, classes, subjects] = await Promise.all([
      api.getTeachers(),
      api.getClasses(),
      api.getSubjects(),
    ])
    return { teachers, classes, subjects }
  })

  if (loading) return <Spinner />
  if (error || !data) return <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />

  const getSubjectName = (t: Teacher) => {
    if (t.subjectName) return t.subjectName
    if (t.subjectId) {
      const s = data.subjects.find((sub) => sub.id === t.subjectId)
      if (s) return s.name
    }
    return 'Fan biriktirilmagan'
  }

  const classLabel = (id: string) => {
    const c = data.classes.find((k) => k.id === id)
    return c ? `${c.grade}-«${c.letter}»` : id
  }

  const toggleClass = (id: string) => {
    if (!form) return
    setForm({
      ...form,
      classIds: form.classIds.includes(id) ? form.classIds.filter((c) => c !== id) : [...form.classIds, id],
    })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return

    if (!form.subjectId) {
      setActionError('Iltimos, o‘qitadigan fanni tanlang')
      return
    }

    setSaving(true)
    setActionError(null)
    try {
      await api.saveTeacher({
        id: form.id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        classIds: form.classIds,
        login: form.login.trim(),
        password: form.password || undefined,
        subjectId: form.subjectId,
      })
      await reload()
      setForm(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!removing) return
    setSaving(true)
    setActionError(null)
    try {
      await api.deleteTeacher(removing.id)
      await reload()
      setRemoving(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'O‘chirishda xatolik')
    } finally {
      setSaving(false)
    }
  }

  const filteredTeachers = data.teachers.filter((t) => {
    if (selectedSubject === 'all') return true
    return t.subjectId === selectedSubject
  })

  return (
    <div className="animate-rise">
      <PageHeader
        title="O‘qituvchilar"
        subtitle="Maktab fanlari o‘qituvchilari va ularning sinflari"
        actions={
          isAdmin && (
            <Button
              onClick={() => {
                setForm({
                  name: '',
                  phone: '',
                  email: '',
                  classIds: [],
                  login: '',
                  password: '',
                  subjectId: data.subjects[0]?.id || '',
                })
                setActionError(null)
              }}
            >
              <Plus size={16} /> O‘qituvchi qo‘shish
            </Button>
          )
        }
      />

      {/* Fanlar bo'yicha filter */}
      {data.subjects.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedSubject('all')}
            className={cn(
              'rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer shadow-xs',
              selectedSubject === 'all'
                ? 'bg-primary-500 text-white shadow-primary-500/25'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-400 dark:border-edge dark:bg-surface dark:text-gray-300'
            )}
          >
            Barcha fanlar ({data.teachers.length})
          </button>
          {data.subjects.map((sub) => {
            const count = data.teachers.filter((t) => t.subjectId === sub.id).length
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubject(sub.id)}
                className={cn(
                  'rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer shadow-xs',
                  selectedSubject === sub.id
                    ? 'bg-primary-500 text-white shadow-primary-500/25'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-400 dark:border-edge dark:bg-surface dark:text-gray-300'
                )}
              >
                {sub.name} ({count})
              </button>
            )
          })}
        </div>
      )}

      {!filteredTeachers.length ? (
        <EmptyState
          title={selectedSubject === 'all' ? 'O‘qituvchilar ro‘yxati bo‘sh' : 'Bu fan bo‘yicha hozircha o‘qituvchilar mavjud emas'}
          hint="Yangi o‘qituvchi qo‘shish uchun yuqoridagi «+ O‘qituvchi qo‘shish» tugmasidan foydalaning."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeachers.map((t) => {
            const subjectName = getSubjectName(t)

            return (
              <Card key={t.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <Avatar name={t.name} photo={t.photo} size="lg" />
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setForm({ ...t, password: '', subjectId: t.subjectId || '' })
                          setActionError(null)
                        }}
                        aria-label="Tahrirlash"
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-primary-500/10 hover:text-primary-500 cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { setRemoving(t); setActionError(null) }}
                        aria-label="O‘chirish"
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
                <h2 className="mt-3 font-semibold text-gray-900 dark:text-white">{t.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <Chip tone={t.subjectId ? 'primary' : 'gray'} className="text-[11px] font-medium">
                    {subjectName}
                  </Chip>
                </div>
                {isAdmin && (
                  <Chip tone="gray" className="mt-2 self-start font-mono text-[10px]">
                    @{t.login}
                  </Chip>
                )}

                <div className="mt-4 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  {t.phone && (
                    <span className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400" />
                      {t.phone}
                    </span>
                  )}
                  {t.email && (
                    <span className="flex items-center gap-2">
                      <Mail size={13} className="text-gray-400" />
                      {t.email}
                    </span>
                  )}
                </div>

                <div className="mt-4 border-t border-gray-100 pt-3 dark:border-surface-2">
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    Biriktirilgan sinflar
                  </span>
                  {t.classIds.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {t.classIds.map((cid) => (
                        <Chip key={cid} tone="primary">
                          {classLabel(cid)}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">Sinflar biriktirilmagan</p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / edit */}
      <Modal open={form !== null} title={form?.id ? 'O‘qituvchini tahrirlash' : 'Yangi o‘qituvchi'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Familiya va ism *">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Karimov Anvar"
                required
                autoFocus
              />
            </Field>

            <Field label="O‘qitadigan fani *">
              <Select
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                required
              >
                <option value="">Fan tanlang...</option>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || 'Fan'})
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Telefon">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="a.karimov@maktab.uz"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-lg border border-primary-500/20 bg-primary-500/5 p-4 sm:grid-cols-2">
              <Field label="Tizimga kirish logini *">
                <Input
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  placeholder="karimov"
                  required
                  autoComplete="off"
                />
              </Field>
              <Field label={form.id ? 'Yangi parol (ixtiyoriy)' : 'Parol *'}>
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={form.id ? 'O‘zgartirmaslik uchun bo‘sh' : '••••'}
                  required={!form.id}
                  autoComplete="off"
                />
              </Field>
              <p className="text-xs text-gray-400 sm:col-span-2">
                Bu login va parol bilan o‘qituvchi tizimga kiradi va o‘z darslarini olib boradi.
              </p>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Biriktirilgan sinflar
              </span>
              <div className="flex flex-wrap gap-2">
                {data.classes.map((c) => {
                  const active = form.classIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleClass(c.id)}
                      className={
                        active
                          ? 'rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white cursor-pointer'
                          : 'rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-primary-400 dark:border-edge dark:text-gray-400 cursor-pointer'
                      }
                    >
                      {c.grade}-«{c.letter}»
                    </button>
                  )
                })}
              </div>
            </div>
            {actionError && <p className="text-sm text-red-500">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={removing !== null} title="O‘qituvchini o‘chirish" onClose={() => setRemoving(null)}>
        {removing && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Haqiqatan ham <strong className="text-gray-900 dark:text-white">{removing.name}</strong> hisobini
              o‘chirmoqchimisiz?
            </p>
            {actionError && <p className="text-sm text-red-500">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                Bekor qilish
              </Button>
              <Button variant="danger" onClick={remove} disabled={saving}>
                {saving ? 'O‘chirilmoqda...' : 'O‘chirish'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
