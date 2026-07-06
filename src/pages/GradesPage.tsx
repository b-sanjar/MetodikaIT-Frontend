import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpen } from 'lucide-react'
import * as api from '../services/api'
import { useFetch } from '../hooks/useFetch'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, Spinner } from '../components/States'

export default function GradesPage() {
  const { data: grades, loading, error, reload } = useFetch(() => api.getGradeSummaries())

  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!grades?.length) return <EmptyState title="Darslar topilmadi" />

  return (
    <div className="animate-rise">
      <PageHeader
        title="Darslar"
        subtitle="1-sinfdan 11-sinfgacha butun o‘quv yili — choraklar bo‘yicha tayyor ishlanmalar"
      />
      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grades.map((g) => {
          const percent = Math.round((g.readyCount / g.lessonCount) * 100)
          return (
            <Link key={g.grade} to={`/darslar/${g.grade}`}>
              <Card hover className="group relative h-full overflow-hidden p-5">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-linear-to-br from-primary-500/20 to-fuchsia-500/15 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <div className="flex items-start justify-between">
                  <span className="font-display flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-primary-500/30 ring-1 ring-white/25 ring-inset transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    {g.grade}
                  </span>
                  <ArrowUpRight
                    size={18}
                    className="text-gray-300 transition-colors group-hover:text-primary-500 dark:text-gray-600"
                  />
                </div>
                <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{g.grade}-sinf</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <BookOpen size={14} /> {g.lessonCount} dars · 4 chorak
                </p>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-[11px] text-gray-400">
                    <span>Tayyor ishlanmalar</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-surface-2">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-primary-500 to-violet-500 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
