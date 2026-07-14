import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, Eye, EyeOff, LoaderCircle, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Card from '../components/Card'
import { Field, Input } from '../components/Field'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(loginName, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-white/60 bg-white/80 p-8 shadow-2xl shadow-primary-500/10 backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-surface/80 dark:shadow-black/40">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Login">
          <Input
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="Login"
            className="h-12 text-base"
            autoFocus
            autoComplete="username"
            required
          />
        </Field>
        <Field label="Parol">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="h-12 pr-11 text-base"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
              title={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        {error && (
          <p className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            <CircleAlert size={16} /> {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="mt-1">
          {loading ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}
          Kirish
        </Button>
      </form>
    </Card>
  )
}
