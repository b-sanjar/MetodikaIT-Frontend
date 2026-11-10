import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import type { JournalEntry } from '../types'
import { QUARTER_NAMES } from '../data/curriculum'
import { cn } from '../utils/cn'
import { formatDateShort } from '../utils/format'

interface Props {
  entries: JournalEntry[]
  defaultQuarter?: number
  studentName?: string
  className?: string
}

function getQuarterFromDate(dateStr: string): number {
  if (!dateStr) return 1
  const parts = dateStr.split('-')
  const month = Number(parts[1])
  if (month >= 9 && month <= 10) return 1 // Sep, Oct
  if (month >= 11 && month <= 12) return 2 // Nov, Dec
  if (month >= 1 && month <= 3) return 3 // Jan, Feb, Mar
  if (month >= 4 && month <= 6) return 4 // Apr, May, Jun
  return 1
}

const GRADE_COLORS: Record<number, { stroke: string; fill: string; text: string; bg: string }> = {
  5: { stroke: '#10b981', fill: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' },
  4: { stroke: '#3b82f6', fill: '#3b82f6', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500' },
  3: { stroke: '#f59e0b', fill: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' },
  2: { stroke: '#ef4444', fill: '#ef4444', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500' },
}

export default function StudentQuarterChart({
  entries,
  defaultQuarter = 2,
  studentName,
  className,
}: Props) {
  const [selectedQuarter, setSelectedQuarter] = useState<number | 'all'>(defaultQuarter)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Filter entries according to quarter
  const quarterEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
    if (selectedQuarter === 'all') return sorted
    return sorted.filter((e) => getQuarterFromDate(e.date) === selectedQuarter)
  }, [entries, selectedQuarter])

  // Compute stats for current quarter view
  const stats = useMemo(() => {
    let sum = 0
    let countGrades = 0
    let count5 = 0
    let count4 = 0
    let count3 = 0
    let count2 = 0
    let attended = 0
    let late = 0
    let missed = 0
    let issues = 0

    for (const e of quarterEntries) {
      if (e.grade != null) {
        sum += e.grade
        countGrades++
        if (e.grade === 5) count5++
        else if (e.grade === 4) count4++
        else if (e.grade === 3) count3++
        else if (e.grade === 2) count2++
      }
      if (e.attendance === 'keldi') attended++
      else if (e.attendance === 'kechikdi') late++
      else if (['kelmadi', 'sababli', 'sababsiz'].includes(e.attendance)) missed++
      if (e.needsWork) issues++
    }

    const totalLessons = quarterEntries.length
    const avg = countGrades > 0 ? (sum / countGrades).toFixed(1) : '—'
    const highGrades = count5 + count4
    const masteryPct = countGrades > 0 ? Math.round((highGrades / countGrades) * 100) : 0
    const attendancePct = totalLessons > 0 ? Math.round(((attended + late) / totalLessons) * 100) : 100

    return {
      totalLessons,
      countGrades,
      avg,
      count5,
      count4,
      count3,
      count2,
      attended,
      late,
      missed,
      issues,
      masteryPct,
      attendancePct,
    }
  }, [quarterEntries])

  // Graded points for the SVG line chart
  const chartPoints = useMemo(() => {
    return quarterEntries.map((e, idx) => ({
      ...e,
      index: idx,
    }))
  }, [quarterEntries])

  // SVG Chart Dimensions
  const width = 600
  const height = 220
  const paddingX = 45
  const paddingY = 30
  const chartW = width - paddingX * 2
  const chartH = height - paddingY * 2

  // Map grade (2..5) to Y coordinate
  const getY = (grade: number | null) => {
    if (grade == null) return height - paddingY // bottom
    // 5 is top (paddingY), 2 is bottom (height - paddingY)
    const norm = (grade - 2) / 3 // 0 for 2, 1 for 5
    return height - paddingY - norm * chartH
  }

  // Map index to X coordinate
  const getX = (idx: number, total: number) => {
    if (total <= 1) return width / 2
    return paddingX + (idx / (total - 1)) * chartW
  }

  // Generate SVG path for line chart
  const pathD = useMemo(() => {
    const graded = chartPoints.filter((p) => p.grade != null)
    if (graded.length === 0) return ''
    if (graded.length === 1) {
      const x = getX(graded[0].index, chartPoints.length)
      const y = getY(graded[0].grade)
      return `M ${x - 20} ${y} L ${x + 20} ${y}`
    }

    let d = ''
    chartPoints.forEach((p, i) => {
      if (p.grade == null) return
      const x = getX(i, chartPoints.length)
      const y = getY(p.grade)
      if (!d) d = `M ${x} ${y}`
      else d += ` L ${x} ${y}`
    })
    return d
  }, [chartPoints])

  // Area path for gradient background fill
  const areaD = useMemo(() => {
    if (!pathD || chartPoints.length === 0) return ''
    const graded = chartPoints.filter((p) => p.grade != null)
    if (graded.length < 2) return ''
    const firstX = getX(chartPoints.findIndex((p) => p.grade != null), chartPoints.length)
    const lastX = getX(
      chartPoints.reduce((last, p, i) => (p.grade != null ? i : last), 0),
      chartPoints.length,
    )
    const bottomY = height - paddingY
    return `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
  }, [pathD, chartPoints])

  const hoveredItem = hoveredIndex !== null ? chartPoints[hoveredIndex] : null

  return (
    <div className={cn('rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-edge dark:bg-surface-2', className)}>
      {/* Header with Title and Quarter Switcher Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <BarChart3 size={18} className="text-primary-500" />
            O‘zlashtirish va rivojlanish statistikasi
          </h3>
          <p className="text-xs text-gray-400">
            {studentName ? `${studentName}ning darslardagi dinamikasi` : 'Choraklik baholar va davomat grafigi'}
          </p>
        </div>

        {/* Quarter Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-gray-100/80 p-1 dark:bg-surface-3">
          {QUARTER_NAMES.map((_name, i) => {
            const qNum = i + 1
            const isActive = selectedQuarter === qNum
            return (
              <button
                key={qNum}
                type="button"
                onClick={() => setSelectedQuarter(qNum)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                  isActive
                    ? 'bg-white text-primary-600 shadow-sm dark:bg-surface dark:text-primary-400'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                {qNum}-chorak
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setSelectedQuarter('all')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
              selectedQuarter === 'all'
                ? 'bg-white text-primary-600 shadow-sm dark:bg-surface dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            Barchasi
          </button>
        </div>
      </div>

      {/* Primary Metrics Row */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* O'rtacha baho */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center dark:bg-emerald-500/10">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">O‘rtacha baho</p>
          <div className="mt-1 flex items-baseline justify-center gap-1.5">
            <span className="text-3xl font-black text-emerald-600 tabular-nums dark:text-emerald-400">
              {stats.avg}
            </span>
            <span className="text-xs text-gray-400">/ 5.0</span>
          </div>
          <span className="mt-1 inline-flex items-center justify-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            {Number(stats.avg) >= 4.5 ? (
              <span className="inline-flex items-center gap-1">
                <Award size={12} className="text-emerald-600 dark:text-emerald-400" /> A’lo natija
              </span>
            ) : Number(stats.avg) >= 3.5 ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={12} className="text-blue-600 dark:text-blue-400" /> Yaxshi
              </span>
            ) : Number(stats.avg) >= 2.5 ? (
              <span className="inline-flex items-center gap-1">
                <Check size={12} className="text-amber-600 dark:text-amber-400" /> Qoniqarli
              </span>
            ) : (
              <span>Hali baholanmagan</span>
            )}
          </span>
        </div>

        {/* O'zlashtirish foizi */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center dark:bg-blue-500/10">
          <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">O‘zlashtirish (Sifat)</p>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span className="text-3xl font-black text-blue-600 tabular-nums dark:text-blue-400">
              {stats.masteryPct}%
            </span>
          </div>
          <span className="mt-1 text-[10px] text-gray-400">
            {stats.count5 + stats.count4} ta «4» va «5» baholar
          </span>
        </div>

        {/* Davomat */}
        <div className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-3 text-center dark:bg-primary-500/10">
          <p className="text-[11px] font-semibold text-primary-700 dark:text-primary-300">Davomat ko‘rsatkichi</p>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span className="text-3xl font-black text-primary-600 tabular-nums dark:text-primary-400">
              {stats.attendancePct}%
            </span>
          </div>
          <span className="mt-1 text-[10px] text-gray-400">
            {stats.attended + stats.late} ta darsda qatnashgan
          </span>
        </div>

        {/* Kamchiliklar & Nazorat */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center dark:bg-amber-500/10">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Kamchiliklar eslatmasi</p>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span
              className={cn(
                'text-3xl font-black tabular-nums',
                stats.issues > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {stats.issues}
            </span>
            <span className="text-xs text-gray-400">ta</span>
          </div>
          <div className="mt-1 text-[10px]">
            {stats.issues > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle size={11} /> Qayta so‘rash tavsiya etiladi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Check size={11} /> Kamchilik qayd etilmagan
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SVG Interactive Progress Chart */}
      <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-3 dark:border-edge dark:bg-surface-3/50">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
            <TrendingUp size={15} className="text-primary-500" />
            Darslar kesimida o‘zlashtirish dinamikasi
          </span>
          <span className="text-[11px] text-gray-400">
            {chartPoints.length} ta dars mashg‘uloti
          </span>
        </div>

        {chartPoints.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center text-center text-xs text-gray-400">
            <BookOpen size={24} className="mb-2 opacity-40 text-gray-400" />
            Ushbu chorakda hali o‘tilgan darslar ma’lumotlari mavjud emas.
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-48 overflow-visible select-none"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grade Guide Lines */}
              {[5, 4, 3, 2].map((g) => {
                const y = getY(g)
                return (
                  <g key={g} className="opacity-50">
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-gray-400 text-[11px] font-bold"
                    >
                      {g}
                    </text>
                  </g>
                )
              })}

              {/* Gradient Area Fill */}
              {areaD && <path d={areaD} fill="url(#areaGradient)" />}

              {/* Progress Line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="filter drop-shadow-sm transition-all"
                />
              )}

              {/* Data Points on Line */}
              {chartPoints.map((p, i) => {
                const x = getX(i, chartPoints.length)
                const y = getY(p.grade)
                const isHovered = hoveredIndex === i
                const color = p.grade ? GRADE_COLORS[p.grade] : null

                return (
                  <g
                    key={p.id || i}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Vertical indicator line on hover */}
                    {isHovered && (
                      <line
                        x1={x}
                        y1={paddingY}
                        x2={x}
                        y2={height - paddingY}
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {p.grade != null ? (
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 9 : 6}
                          fill={color?.fill || '#10b981'}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="transition-all duration-150 drop-shadow"
                        />
                        <text
                          x={x}
                          y={y + 3.5}
                          textAnchor="middle"
                          fill="#ffffff"
                          className="text-[9px] font-black pointer-events-none"
                        >
                          {p.grade}
                        </text>
                      </>
                    ) : (
                      <circle
                        cx={x}
                        cy={height - paddingY}
                        r={isHovered ? 5 : 3.5}
                        fill={p.attendance === 'sababli' ? '#0ea5e9' : p.attendance === 'keldi' ? '#10b981' : '#ef4444'}
                        className="transition-all"
                      />
                    )}

                    {/* Date label at bottom */}
                    <text
                      x={x}
                      y={height - paddingY + 18}
                      textAnchor="middle"
                      className="fill-gray-400 text-[9px] font-medium"
                    >
                      {formatDateShort(p.date)}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Hover Tooltip Card */}
            {hoveredItem && (
              <div
                className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-md dark:border-edge dark:bg-surface/95 z-30 min-w-44 text-center transition-all animate-in fade-in zoom-in-95"
              >
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                  <span>Sana: {hoveredItem.date}</span>
                </div>
                <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                  {hoveredItem.grade != null ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Baho: {hoveredItem.grade}
                    </span>
                  ) : (
                    <span className="text-gray-400">Baholanmagan</span>
                  )}
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-500 capitalize">{hoveredItem.attendance}</span>
                </div>
                {hoveredItem.needsWork && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>Kamchilik: {hoveredItem.note || 'Keyingi darsda so‘ralsin'}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grade Distribution Bar */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-edge">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
          <span>Baholar taqsimoti</span>
          <span className="text-[11px] font-normal text-gray-400">
            Jami {stats.countGrades} ta baho
          </span>
        </div>

        {/* Segmented bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-surface-3">
          {stats.count5 > 0 && (
            <div
              style={{ width: `${(stats.count5 / (stats.countGrades || 1)) * 100}%` }}
              className="bg-emerald-500 transition-all"
              title={`5 baholar: ${stats.count5} ta`}
            />
          )}
          {stats.count4 > 0 && (
            <div
              style={{ width: `${(stats.count4 / (stats.countGrades || 1)) * 100}%` }}
              className="bg-blue-500 transition-all"
              title={`4 baholar: ${stats.count4} ta`}
            />
          )}
          {stats.count3 > 0 && (
            <div
              style={{ width: `${(stats.count3 / (stats.countGrades || 1)) * 100}%` }}
              className="bg-amber-500 transition-all"
              title={`3 baholar: ${stats.count3} ta`}
            />
          )}
          {stats.count2 > 0 && (
            <div
              style={{ width: `${(stats.count2 / (stats.countGrades || 1)) * 100}%` }}
              className="bg-red-500 transition-all"
              title={`2 baholar: ${stats.count2} ta`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="mt-2.5 grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-lg bg-emerald-500/10 p-1.5 dark:bg-emerald-500/15">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">«5» A’lo: </span>
            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{stats.count5} ta</span>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-1.5 dark:bg-blue-500/15">
            <span className="font-bold text-blue-600 dark:text-blue-400">«4» Yaxshi: </span>
            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{stats.count4} ta</span>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-1.5 dark:bg-amber-500/15">
            <span className="font-bold text-amber-600 dark:text-amber-400">«3» Qoniqarli: </span>
            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{stats.count3} ta</span>
          </div>
          <div className="rounded-lg bg-red-500/10 p-1.5 dark:bg-red-500/15">
            <span className="font-bold text-red-600 dark:text-red-400">«2» Qoniqarsiz: </span>
            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{stats.count2} ta</span>
          </div>
        </div>
      </div>
    </div>
  )
}
