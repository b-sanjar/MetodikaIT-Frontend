import { useState, type FormEvent } from 'react'
import { Mail, Pencil, Phone, Plus, School, Trash2 } from 'lucide-react'
import * as api from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { Field, Input } from '../components/Field'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import type { Teacher } from '../types'

interface FormState {
  id?: string
  name: string
  phone: string
  email: string
  classIds: string[]
  login: string
  password: string
}

export default function TeachersPage() {
  const { isAdmin } = useAuth()
  const [form, setForm] = useState<FormState | null>(null)
  const [removing, setRemoving] = useState<Teacher | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, loading, error, reload, setData } = useFetch(async () => {
    const [teachers, classes] = await Promise.all([api.getTeachers(), api.getClasses()])
    return { teachers, classes }
  })

  if (loading) return <Spinner />
  if (error || !data) return <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />

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
    setSaving(true)
    setActionError(null)
    try {
      const saved = await api.saveTeacher({
        id: form.id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        classIds: form.classIds,
        login: form.login.trim(),
        password: form.password || undefined,
      })
      setData((prev) => ({
        ...prev,
        teachers: form.id
          ? prev.teachers.map((t) => (t.id === saved.id ? saved : t))
          : [...prev.teachers, saved],
      }))
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
      setData((prev) => ({ ...prev, teachers: prev.teachers.filter((t) => t.id !== removing.id) }))
      setRemoving(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'O‘chirishda xatolik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="O‘qituvchilar"
        subtitle="Informatika fani o‘qituvchilari va biriktirilgan sinflar"
        actions={
          isAdmin && (
            <Button onClick={() => { setForm({ name: '', phone: '', email: '', classIds: [], login: '', password: '' }); setActionError(null) }}>
              <Plus size={16} /> O‘qituvchi qo‘shish
            </Button>
          )
        }
      />

      {!data.teachers.length ? (
        <EmptyState title="O‘qituvchilar ro‘yxati bo‘sh" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.teachers.map((t) => (
            <Card key={t.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <Avatar name={t.name} photo={t.photo} size="lg" />
                {isAdmin && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setForm({ ...t, password: '' }); setActionError(null) }}
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
              <p className="text-xs text-gray-400">Informatika o‘qituvchisi</p>
              {isAdmin && (
                <Chip tone="gray" className="mt-2 self-start font-mono">
                  @{t.login}
                </Chip>
              )}
              <div className="mt-3 flex flex-col gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-2">
                  <Phone size={13} /> {t.phone || '—'}
                </span>
                <span className="flex items-center gap-2 truncate">
                  <Mail size={13} /> {t.email || '—'}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-100 pt-4 dark:border-edge">
                <School size={14} className="mt-0.5 text-gray-300 dark:text-gray-600" />
                {t.classIds.length ? (
                  t.classIds.map((c) => (
                    <Chip key={c} tone="primary">
                      {classLabel(c)} sinf
                    </Chip>
                  ))
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-600">Sinf biriktirilmagan</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / edit */}
      <Modal open={form !== null} title={form?.id ? 'O‘qituvchini tahrirlash' : 'Yangi o‘qituvchi'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Familiya va ism">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Karimov Anvar"
                required
                autoFocus
              />
            </Field>
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
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-primary-500/20 bg-primary-500/5 p-4 sm:grid-cols-2">
              <Field label="Tizimga kirish logini">
                <Input
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  placeholder="karimov"
                  required
                  autoComplete="off"
                />
              </Field>
              <Field label={form.id ? 'Yangi parol (ixtiyoriy)' : 'Parol'}>
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
                Bu ma’lumotlar bilan o‘qituvchi tizimga kiradi. Keyin o‘z profilida parolini o‘zi almashtira oladi.
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
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>{removing?.name}</strong> ro‘yxatdan o‘chirilsinmi?
        </p>
        {actionError && <p className="mt-3 text-sm text-red-500">{actionError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            Bekor qilish
          </Button>
          <Button variant="danger" onClick={remove} disabled={saving}>
            {saving ? 'O‘chirilmoqda...' : 'O‘chirish'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
