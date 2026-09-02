import { useState, type FormEvent } from 'react'
import {
  Atom,
  BookOpen,
  Calculator,
  Code,
  Dna,
  FlaskConical,
  GraduationCap,
  Landmark,
  Languages,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks/useFetch'
import * as api from '../services/api'
import type { Subject } from '../types'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import { Field, Input, Select, Textarea } from '../components/Field'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, Spinner } from '../components/States'

const ICON_MAP: Record<string, any> = {
  Code,
  Calculator,
  Atom,
  BookOpen,
  Languages,
  FlaskConical,
  Dna,
  Landmark,
  Layers,
  GraduationCap,
}

const COLOR_CLASSES: Record<string, { bg: string; text: string; ring: string }> = {
  indigo: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-500/30' },
  emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/30' },
  sky: { bg: 'bg-sky-500/10 dark:bg-sky-500/20', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-500/30' },
  amber: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/30' },
  blue: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/30' },
  rose: { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500/30' },
  teal: { bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-500/30' },
  orange: { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500/30' },
  purple: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/30' },
  violet: { bg: 'bg-violet-500/10 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500/30' },
}

interface FormState {
  id?: string
  name: string
  code: string
  description: string
  color: string
  icon: string
  order: number
}

const EMPTY_FORM: FormState = {
  name: '',
  code: '',
  description: '',
  color: 'indigo',
  icon: 'BookOpen',
  order: 1,
}

export default function SubjectsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const { data: subjects, loading, error, reload } = useFetch(() => api.getSubjects())

  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<Subject | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, order: (subjects?.length ?? 0) + 1 })
    setActionError(null)
  }

  const openEdit = (sub: Subject) => {
    setForm({
      id: sub.id,
      name: sub.name,
      code: sub.code || '',
      description: sub.description || '',
      color: sub.color || 'indigo',
      icon: sub.icon || 'BookOpen',
      order: sub.order || 1,
    })
    setActionError(null)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!form || !form.name.trim()) return

    setSaving(true)
    setActionError(null)
    try {
      await api.saveSubject(form)
      await reload()
      setForm(null)
    } catch (err: any) {
      setActionError(err?.message || 'Fanni saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!removing) return
    setSaving(true)
    setActionError(null)
    try {
      await api.deleteSubject(removing.id)
      await reload()
      setRemoving(null)
    } catch (err: any) {
      setActionError(err?.message || 'Fanni o‘chirishda xatolik')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="animate-rise">
      <PageHeader
        title="Fanlar"
        subtitle="Maktabda o‘qitiladigan barcha fanlar, ularning o‘qituvchilari va dars bazasi"
        actions={
          isAdmin && (
            <Button onClick={openAdd}>
              <Plus size={16} /> Fan qo‘shish
            </Button>
          )
        }
      />

      {!subjects?.length ? (
        <EmptyState
          title="Hozircha fanlar mavjud emas"
          hint="Administrator sifatida «+ Fan qo‘shish» tugmasi orqali yangi fan kiriting."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subjects.map((sub) => {
            const IconComp = ICON_MAP[sub.icon] || BookOpen
            const colorStyle = COLOR_CLASSES[sub.color] || COLOR_CLASSES.indigo

            return (
              <Card key={sub.id} className="group relative flex flex-col justify-between overflow-hidden p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                <div>
                  <div className="flex items-start justify-between">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset shadow-md transition-transform duration-300 group-hover:scale-110 ${colorStyle.bg} ${colorStyle.text} ${colorStyle.ring}`}
                    >
                      <IconComp size={24} />
                    </span>
                    <div className="flex items-center gap-1.5">
                      {sub.code && (
                        <Chip tone="gray" className="font-mono text-[10px] uppercase font-bold">
                          {sub.code}
                        </Chip>
                      )}
                      {isAdmin && (
                        <div className="flex gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(sub)}
                            aria-label="Tahrirlash"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-primary-500/10 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => { setRemoving(sub); setActionError(null) }}
                            aria-label="O‘chirish"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-500 cursor-pointer transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h2 className="mt-4 text-base font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {sub.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                    {sub.description || 'Fan bo‘yicha metodik darslar va o‘qituvchilar tizimi.'}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 dark:border-surface-2/60 pt-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-primary-500" />
                    <strong>{sub.teacherCount ?? 0}</strong> o‘qituvchi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={14} className="text-violet-500" />
                    <strong>{sub.lessonCount ?? 0}</strong> dars
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      {form && (
        <Modal
          open={form !== null}
          title={form.id ? 'Fanni tahrirlash' : 'Yangi fan qo‘shish'}
          onClose={() => setForm(null)}
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Field label="Fan nomi *">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Masalan: Biologiya, Robototexnika"
                required
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Qisqa kodi">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Masalan: BIO"
                  maxLength={6}
                />
              </Field>
              <Field label="Tartib raqami">
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 1 })}
                  min={1}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Rang uslubi">
                <Select
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                >
                  <option value="indigo">Indigo (To‘q moviy)</option>
                  <option value="emerald">Emerald (Yashil)</option>
                  <option value="sky">Sky (Havorang)</option>
                  <option value="amber">Amber (Sariq)</option>
                  <option value="blue">Blue (Ko‘k)</option>
                  <option value="rose">Rose (Qizil)</option>
                  <option value="teal">Teal (Moviy-yashil)</option>
                  <option value="orange">Orange (To‘q sariq)</option>
                  <option value="purple">Purple (Binafsha)</option>
                  <option value="violet">Violet (Siyohrang)</option>
                </Select>
              </Field>

              <Field label="Belgisi (Icon)">
                <Select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                >
                  <option value="BookOpen">Kitob (BookOpen)</option>
                  <option value="Code">Dasturlash (Code)</option>
                  <option value="Calculator">Kalkulyator (Calculator)</option>
                  <option value="Atom">Atom / Fizika (Atom)</option>
                  <option value="Languages">Tillar (Languages)</option>
                  <option value="FlaskConical">Kimyo (FlaskConical)</option>
                  <option value="Dna">Biologiya (Dna)</option>
                  <option value="Landmark">Tarix (Landmark)</option>
                  <option value="Layers">Qatlamlar (Layers)</option>
                  <option value="GraduationCap">Ta’lim (GraduationCap)</option>
                </Select>
              </Field>
            </div>

            <Field label="Qisqacha tavsifi">
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Fanning asosiy yo‘nalishi va maqsadi..."
              />
            </Field>

            {actionError && <p className="text-sm text-red-500">{actionError}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Subject Confirmation Modal */}
      {removing && (
        <Modal open={removing !== null} title="Fanni o‘chirish" onClose={() => setRemoving(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Haqiqatan ham <strong className="text-gray-900 dark:text-white">«{removing.name}»</strong> fanini o‘chirmoqchimisiz?
            </p>
            {removing.teacherCount && removing.teacherCount > 0 ? (
              <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                Diqqat: Ushbu fanga {removing.teacherCount} nafar o‘qituvchi biriktirilgan. Fanni o‘chirish uchun avval ularni boshqa fanga o‘tkazishingiz kerak.
              </p>
            ) : null}
            {actionError && <p className="text-sm text-red-500">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                Bekor qilish
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'O‘chirilmoqda...' : 'O‘chirish'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
