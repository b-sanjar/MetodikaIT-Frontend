import { useMemo, useState, type FormEvent } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import * as api from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import StudentProfileModal from '../components/StudentProfileModal'
import { Field, Input, Select } from '../components/Field'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import type { Student } from '../types'

interface FormState {
  id?: string
  name: string
  classId: string
}

export default function StudentsPage() {
  const { isAdmin } = useAuth()
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [form, setForm] = useState<FormState | null>(null)
  const [removing, setRemoving] = useState<Student | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, loading, error, reload, setData } = useFetch(async () => {
    const [students, classes, badgeDefs] = await Promise.all([
      api.getStudents(),
      api.getClasses(),
      api.getBadgeDefs(),
    ])
    return { students, classes, badgeDefs }
  })

  const filtered = useMemo(() => {
    if (!data) return []
    return data.students
      .filter((s) => (classFilter === 'all' ? true : s.classId === classFilter))
      .filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data, query, classFilter])

  if (loading) return <Spinner />
  if (error || !data) return <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />

  const className = (id: string) => {
    const c = data.classes.find((k) => k.id === id)
    return c ? `${c.grade}-«${c.letter}»` : '—'
  }

  // Overall position by total points — the same ordering the leaderboard uses
  const byPoints = [...data.students].sort((a, b) => b.points - a.points)
  const viewingIndex = byPoints.findIndex((s) => s.id === viewingId)
  const viewing = viewingIndex >= 0 ? byPoints[viewingIndex] : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setActionError(null)
    try {
      const existing = form.id ? data.students.find((s) => s.id === form.id) : undefined
      const saved = await api.saveStudent({
        id: form.id,
        name: form.name.trim(),
        classId: form.classId,
        points: existing?.points ?? 0,
        badges: existing?.badges ?? [],
      })
      setData((prev) => ({
        ...prev,
        students: form.id
          ? prev.students.map((s) => (s.id === saved.id ? saved : s))
          : [...prev.students, saved],
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
      await api.deleteStudent(removing.id)
      setData((prev) => ({ ...prev, students: prev.students.filter((s) => s.id !== removing.id) }))
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
        title="O‘quvchilar"
        subtitle={`Jami ${data.students.length} o‘quvchi ro‘yxatda`}
        actions={
          isAdmin && (
            <Button onClick={() => { setForm({ name: '', classId: data.classes[0]?.id ?? '' }); setActionError(null) }}>
              <Plus size={16} /> O‘quvchi qo‘shish
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ism bo‘yicha qidirish..."
            className="pl-9"
          />
        </div>
        <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="sm:w-44">
          <option value="all">Barcha sinflar</option>
          {data.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.grade}-«{c.letter}» sinf
            </option>
          ))}
        </Select>
      </div>

      {!filtered.length ? (
        <EmptyState title="O‘quvchi topilmadi" hint="Qidiruv so‘zini yoki sinf filtrini o‘zgartirib ko‘ring" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-120 text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left dark:border-edge">
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">O‘quvchi</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Sinf</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Ball</th>
                {isAdmin && <th className="w-24 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setViewingId(s.id)}
                  className="cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-primary-500/5 dark:border-edge/50 dark:hover:bg-white/3"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} size="sm" />
                      <span className="font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Chip tone="primary">{className(s.classId)} sinf</Chip>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums dark:text-white">
                    {s.points}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setForm({ id: s.id, name: s.name, classId: s.classId }); setActionError(null) }}
                          aria-label="Tahrirlash"
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-primary-500/10 hover:text-primary-500 cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRemoving(s); setActionError(null) }}
                          aria-label="O‘chirish"
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <StudentProfileModal
        student={viewing}
        position={viewingIndex + 1}
        classLabel={viewing ? className(viewing.classId) : ''}
        badgeDefs={data.badgeDefs}
        onClose={() => setViewingId(null)}
      />

      {/* Add / edit */}
      <Modal open={form !== null} title={form?.id ? 'O‘quvchini tahrirlash' : 'Yangi o‘quvchi'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Familiya va ism">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Aliyev Vali"
                required
                autoFocus
              />
            </Field>
            <Field label="Sinf">
              <Select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grade}-«{c.letter}» sinf
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
      <Modal open={removing !== null} title="O‘quvchini o‘chirish" onClose={() => setRemoving(null)}>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>{removing?.name}</strong> ro‘yxatdan o‘chirilsinmi? Jurnal yozuvlari ham o‘chadi.
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
