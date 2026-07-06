import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CalendarPlus,
  GraduationCap,
  Presentation,
  School,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import * as api from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Avatar from '../components/Avatar'
import StatCard from '../components/StatCard'
import { ErrorState, Spinner } from '../components/States'
import { formatDateLong, todayISO } from '../utils/format'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useFetch(async () => {
    const [grades, classes, students, teachers] = await Promise.all([
      api.getGradeSummaries(),
      api.getClasses(),
      api.getStudents(),
      api.getTeachers(),
    ])
    return { grades, classes, students, teachers }
  })

  if (loading) return <Spinner />
  if (error || !data) return <ErrorState message={error ?? 'Ma’lumot topilmadi'} onRetry={reload} />

  const totalLessons = data.grades.reduce((sum, g) => sum + g.lessonCount, 0)
  const top = [...data.students].sort((a, b) => b.points - a.points).slice(0, 5)

  return (
    <div className="animate-rise">
      {/* Hero banner */}
      <div className="relative mb-6 overflow-hidden rounded-xl bg-linear-to-br from-primary-600 via-primary-500 to-violet-600 p-6 text-white shadow-xl shadow-primary-500/25 sm:p-8">
        <div aria-hidden className="grid-pattern pointer-events-none absolute inset-0" />
        <div aria-hidden className="animate-glow pointer-events-none absolute -top-20 right-10 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <div
          aria-hidden
          className="animate-glow pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-fuchsia-400/25 blur-3xl"
          style={{ animationDelay: '-2s' }}
        />
        <Sparkles
          aria-hidden
          size={22}
          className="animate-sparkle pointer-events-none absolute top-7 right-8 text-white/70 sm:right-12"
        />
        <Sparkles
          aria-hidden
          size={14}
          className="animate-sparkle pointer-events-none absolute right-24 bottom-8 text-white/50 sm:right-32"
          style={{ animationDelay: '-1.3s' }}
        />
        <div className="relative">
          <p className="text-xs font-medium tracking-wide text-white/70 uppercase">{formatDateLong(todayISO())}</p>
          <h1 className="font-display mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Xush kelibsiz, {user?.name.split(' ')[0] ?? ''}! 👋
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-white/80">
            Bugungi darsga tayyorlanish, taqdimot o‘tkazish va baholash uchun hammasi shu yerda.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/darslar"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-primary-600 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <Presentation size={16} /> Darsni boshlash
            </Link>
            <Link
              to="/jurnal"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/15 px-4 text-sm font-semibold text-white ring-1 ring-white/30 ring-inset backdrop-blur transition-all hover:bg-white/25"
            >
              <CalendarPlus size={16} /> Jurnalni ochish
            </Link>
          </div>
        </div>
      </div>

      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Darslar" value={String(totalLessons)} hint="1–11-sinflar, 4 chorak" tone="indigo" />
        <StatCard icon={School} label="Sinflar" value={String(data.classes.length)} hint="Faol sinf guruhlari" tone="emerald" />
        <StatCard icon={Users} label="O‘quvchilar" value={String(data.students.length)} hint="Reytingda ishtirokda" tone="amber" />
        <StatCard icon={GraduationCap} label="O‘qituvchilar" value={String(data.teachers.length)} hint="Informatika fani" tone="sky" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Grades quick access */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sinflar bo‘yicha darslar</h2>
            <Link
              to="/darslar"
              className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Barchasi <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {data.grades.map((g) => (
              <Link
                key={g.grade}
                to={`/darslar/${g.grade}`}
                className="group flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-gray-50/60 p-4 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/10 dark:border-edge dark:bg-surface-2 dark:hover:border-primary-500/50"
              >
                <span className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">
                  {g.grade}
                </span>
                <span className="text-[11px] text-gray-400">{g.lessonCount} dars</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Mini leaderboard */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Faol o‘quvchilar</h2>
            <Link
              to="/reyting"
              className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Reyting <ArrowRight size={14} />
            </Link>
          </div>
          <ol className="flex flex-col gap-3">
            {top.map((s, i) => {
              const klass = data.classes.find((c) => c.id === s.classId)
              return (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-semibold text-gray-400">{i + 1}</span>
                  <Avatar name={s.name} size="sm" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {klass ? `${klass.grade}-«${klass.letter}» sinf` : ''}
                    </p>
                  </div>
                  <Chip tone={i === 0 ? 'amber' : 'primary'}>
                    {i === 0 && <Trophy size={12} />} {s.points} ball
                  </Chip>
                </li>
              )
            })}
          </ol>
        </Card>
      </div>
    </div>
  )
}
