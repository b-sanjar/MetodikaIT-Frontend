import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, CheckCircle2, KeyRound, UserRound } from 'lucide-react'
import * as api from '../services/api'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import PageHeader from '../components/PageHeader'
import { Field, Input } from '../components/Field'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [photo, setPhoto] = useState(user?.photo ?? '')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isTeacher = user?.role === 'teacher'

  // Teachers have extra contact fields stored on the teacher record
  useEffect(() => {
    if (!isTeacher || !user) return
    let alive = true
    api.getTeacherProfile(user.id).then((t) => {
      if (alive && t) {
        setPhone(t.phone)
        setEmail(t.email)
      }
    })
    return () => {
      alive = false
    }
  }, [isTeacher, user])

  if (!user) return null

  const onPhotoPick = (file: File | undefined) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Rasm hajmi 2 MB dan oshmasin')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhoto(String(reader.result))
    reader.readAsDataURL(file)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    if (password && password !== password2) {
      setError('Parollar bir-biriga mos kelmadi')
      return
    }
    if (password && password.length < 4) {
      setError('Parol kamida 4 belgidan iborat bo‘lsin')
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        name: name.trim(),
        photo,
        ...(isTeacher ? { phone: phone.trim(), email: email.trim() } : {}),
        ...(password ? { password } : {}),
      })
      setPassword('')
      setPassword2('')
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-rise mx-auto max-w-2xl">
      <PageHeader title="Profil" subtitle="Shaxsiy ma’lumotlar, rasm va parolni boshqarish" />

      <form onSubmit={submit} className="stagger flex flex-col gap-6">
        {/* Identity */}
        <Card className="p-6">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative">
              <Avatar name={name || user.name} photo={photo} size="xl" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Rasm yuklash"
                className="absolute -right-1 -bottom-1 flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-b from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/40 ring-2 ring-white transition-transform hover:scale-110 dark:ring-surface cursor-pointer"
              >
                <Camera size={15} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhotoPick(e.target.files?.[0])}
              />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">{user.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.title}</p>
              <div className="mt-2 flex justify-center gap-2 sm:justify-start">
                <Chip tone="primary" dot>
                  {user.login}
                </Chip>
              </div>
            </div>
          </div>
        </Card>

        {/* Details */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <UserRound size={15} className="text-primary-500" /> Shaxsiy ma’lumotlar
          </h3>
          <div className="flex flex-col gap-4">
            <Field label="Familiya va ism">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            {isTeacher && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Telefon">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="siz@maktab.uz" />
                </Field>
              </div>
            )}
          </div>
        </Card>

        {/* Password */}
        <Card className="p-6">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <KeyRound size={15} className="text-primary-500" /> Parolni almashtirish
          </h3>
          <p className="mb-4 text-xs text-gray-400">O‘zgartirmoqchi bo‘lmasangiz bo‘sh qoldiring</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Yangi parol">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Yangi parolni tasdiqlang">
              <Input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
              />
            </Field>
          </div>
        </Card>

        {error && <p className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {saved && (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 size={16} /> Profil muvaffaqiyatli saqlandi
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}
          </Button>
        </div>
      </form>
    </div>
  )
}
