import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, LoaderCircle, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Card from '../components/Card'
import { Field, Input } from '../components/Field'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
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
    <Card className="border-white/60 bg-white/80 p-6 shadow-2xl shadow-primary-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-surface/80 dark:shadow-black/40">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Login">
          <Input
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="Login"
            autoFocus
            autoComplete="username"
            required
          />
        </Field>
        <Field label="Parol">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            autoComplete="current-password"
            required
          />
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
