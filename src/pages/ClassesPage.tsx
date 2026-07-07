import { useState, type FormEvent } from 'react'
import { GraduationCap, Pencil, Plus, Trash2, Users } from 'lucide-react'
import * as api from '../services/api'
import { GRADES } from '../data/curriculum'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Card from '../components/Card'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { Field, Input, Select } from '../components/Field'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import type { ClassGroup } from '../types'

interface FormState {
  id?: string
  grade: number
  letter: string
  teacherId: string
}

export default function ClassesPage() {
  const { isAdmin } = useAuth()
  const [form, setForm] = useState<FormState | null>(null)
  const [removing, setRemoving] = useState<ClassGroup | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, loading, error, reload, setData } = useFetch(async () => {
    const [classes, teachers, students] = await Promise.all([
      api.getClasses(),
      api.getTeachers(),
      api.getStudents(),
    ])
    return { classes, teachers, students }
  })

  if (loading) return <Spinner />
  if (error || !data) return <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />

  const teacherName = (id: string | null) => data.teachers.find((t) => t.id === id)?.name
  const studentCount = (id: string) => data.students.filter((s) => s.classId === id).length

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setActionError(null)
    try {
      const saved = await api.saveClass({
        id: form.id,
        grade: form.grade,
        letter: form.letter.trim().toUpperCase(),
        teacherId: form.teacherId,
      })
      setData((prev) => ({
        ...prev,
        classes: form.id ? prev.classes.map((c) => (c.id === saved.id ? saved : c)) : [...prev.classes, saved],
      }))
      setForm(null)
      // teacher.classIds changed on the API side — refresh to stay in sync
      reload()
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
      await api.deleteClass(removing.id)
      setData((prev) => ({ ...prev, classes: prev.classes.filter((c) => c.id !== removing.id) }))
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
        title="Sinflar"
        subtitle="Sinf guruhlari, biriktirilgan o‘qituvchi va o‘quvchilar soni"
        actions={
          isAdmin && (
            <Button
              onClick={() => {
                setForm({ grade: 1, letter: 'A', teacherId: data.teachers[0]?.id ?? '' })
                setActionError(null)
              }}
            >
              <Plus size={16} /> Sinf qo‘shish
            </Button>
          )
        }
      />

      {!data.classes.length ? (
        <EmptyState title="Sinflar ro‘yxati bo‘sh" hint="Birinchi sinf guruhini qo‘shing" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.classes.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 text-base font-semibold text-primary-600 dark:text-primary-300">
                  {c.grade}{c.letter}
                </span>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setForm({ id: c.id, grade: c.grade, letter: c.letter, teacherId: c.teacherId ?? '' })
                        setActionError(null)
                      }}
                      aria-label="Tahrirlash"
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-primary-500/10 hover:text-primary-500 cursor-pointer"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setRemoving(c)
                        setActionError(null)
                      }}
                      aria-label="O‘chirish"
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
              <h2 className="mt-3 font-semibold text-gray-900 dark:text-white">
                {c.grade}-«{c.letter}» sinf
              </h2>
              <div className="mt-3 flex flex-col gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-2">
                  <GraduationCap size={14} /> {teacherName(c.teacherId) ?? 'O‘qituvchi biriktirilmagan'}
                </span>
                <span className="flex items-center gap-2">
                  <Users size={14} /> {studentCount(c.id)} o‘quvchi
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / edit */}
      <Modal open={form !== null} title={form?.id ? 'Sinfni tahrirlash' : 'Yangi sinf'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sinf">
                <Select value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}-sinf
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Harf (A, B, V...)">
                <Input
                  value={form.letter}
                  onChange={(e) => setForm({ ...form, letter: e.target.value })}
                  placeholder="A"
                  maxLength={2}
                  required
                />
              </Field>
            </div>
            <Field label="Informatika o‘qituvchisi">
              <Select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                <option value="">Biriktirilmagan</option>
                {data.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
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
      <Modal open={removing !== null} title="Sinfni o‘chirish" onClose={() => setRemoving(null)}>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>
            {removing?.grade}-«{removing?.letter}» sinf
          </strong>{' '}
          ro‘yxatdan o‘chirilsinmi? Sinf jurnali ham o‘chadi.
        </p>
        {removing && studentCount(removing.id) > 0 && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-300">
            Bu sinfda {studentCount(removing.id)} o‘quvchi bor — avval ularni boshqa sinfga o‘tkazish kerak.
          </p>
        )}
        {actionError && <p className="mt-3 text-sm text-red-500">{actionError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            Bekor qilish
          </Button>
          <Button variant="danger" onClick={remove} disabled={saving || (removing !== null && studentCount(removing.id) > 0)}>
            {saving ? 'O‘chirilmoqda...' : 'O‘chirish'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
