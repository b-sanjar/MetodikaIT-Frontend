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

  const fillDemo = (l: string, p: string) => {
    setLoginName(l)
    setPassword(p)
    setError(null)
  }

  return (
    <Card className="border-white/60 bg-white/80 p-6 shadow-2xl shadow-primary-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-surface/80 dark:shadow-black/40">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Login">
          <Input
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="admin"
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

      <div className="mt-5 border-t border-gray-100 pt-4 dark:border-edge">
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">Namunaviy hisoblar:</p>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => fillDemo('admin', 'admin')}>
            Admin
          </Button>
          <Button variant="outline" size="sm" onClick={() => fillDemo('karimov', '1234')}>
            O‘qituvchi
          </Button>
          <Button variant="outline" size="sm" onClick={() => fillDemo('rahbar', 'rahbar')}>
            Rahbariyat
          </Button>
        </div>
      </div>
    </Card>
  )
}
