// Client-side gamification: rank titles (unvon) derived from points and
// achievements (yutuq) derived from the student + their journal history.
// The backend only stores points/badges — everything here is display logic
// recomputed on the fly (see BACKEND_GAMIFICATION.md for the server wishlist).

import type { LucideIcon } from 'lucide-react'
import {
  Award,
  CalendarCheck,
  Coins,
  Crown,
  Diamond,
  Flame,
  Footprints,
  Gem,
  GraduationCap,
  Medal,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'
import type { JournalEntry, Student } from '../types'

// ---------- Ranks (unvonlar) ----------

export interface Rank {
  id: string
  name: string
  /** Minimum points to hold this rank. */
  min: number
  icon: LucideIcon
  /** Icon/accent text color. */
  text: string
  /** Small pill (table rows, hero). */
  chip: string
  /** Hero banner card in the profile modal. */
  hero: string
  /** Blurred glow blob behind the hero. */
  glow: string
  /** Progress bar fill gradient. */
  bar: string
}

export const RANKS: Rank[] = [
  {
    id: 'yangi',
    name: 'Yangi o‘quvchi',
    min: 0,
    icon: Sparkles,
    text: 'text-gray-400',
    chip: 'bg-gray-500/10 text-gray-500 ring-gray-500/25 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-gray-400/25',
    hero: 'border-gray-300/60 from-gray-400/15 dark:border-gray-500/30',
    glow: 'bg-gray-400/25',
    bar: 'from-gray-400 to-gray-500',
  },
  {
    id: 'bronza',
    name: 'Bronza',
    min: 40,
    icon: Shield,
    text: 'text-orange-500',
    chip: 'bg-orange-500/10 text-orange-600 ring-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-400/25',
    hero: 'border-orange-400/40 from-orange-400/15',
    glow: 'bg-orange-400/25',
    bar: 'from-orange-400 to-amber-600',
  },
  {
    id: 'kumush',
    name: 'Kumush',
    min: 100,
    icon: Medal,
    text: 'text-slate-400',
    chip: 'bg-slate-500/10 text-slate-500 ring-slate-500/25 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/25',
    hero: 'border-slate-400/50 from-slate-400/20',
    glow: 'bg-slate-400/30',
    bar: 'from-slate-400 to-slate-500',
  },
  {
    id: 'oltin',
    name: 'Oltin',
    min: 200,
    icon: Trophy,
    text: 'text-amber-500',
    chip: 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25',
    hero: 'border-amber-400/50 from-amber-400/20',
    glow: 'bg-amber-400/35',
    bar: 'from-amber-400 to-orange-500',
  },
  {
    id: 'platina',
    name: 'Platina',
    min: 350,
    icon: Gem,
    text: 'text-cyan-500',
    chip: 'bg-cyan-500/10 text-cyan-600 ring-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-400/25',
    hero: 'border-cyan-400/50 from-cyan-400/20',
    glow: 'bg-cyan-400/30',
    bar: 'from-cyan-400 to-sky-500',
  },
  {
    id: 'olmos',
    name: 'Olmos',
    min: 550,
    icon: Diamond,
    text: 'text-violet-500',
    chip: 'bg-violet-500/10 text-violet-600 ring-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/25',
    hero: 'border-violet-400/50 from-violet-400/20',
    glow: 'bg-violet-400/30',
    bar: 'from-violet-400 to-purple-500',
  },
  {
    id: 'afsona',
    name: 'Afsona',
    min: 800,
    icon: Crown,
    text: 'text-fuchsia-500',
    chip: 'bg-fuchsia-500/10 text-fuchsia-600 ring-fuchsia-500/30 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-400/25',
    hero: 'border-fuchsia-400/50 from-fuchsia-400/20',
    glow: 'bg-fuchsia-400/30',
    bar: 'from-fuchsia-400 to-pink-500',
  },
]

export function rankFor(points: number): Rank {
  let current = RANKS[0]
  for (const r of RANKS) if (points >= r.min) current = r
  return current
}

export interface RankProgress {
  rank: Rank
  next: Rank | null
  /** 0–100 towards the next rank (100 at the top rank). */
  pct: number
  remaining: number
}

export function rankProgress(points: number): RankProgress {
  const rank = rankFor(points)
  const next = RANKS[RANKS.indexOf(rank) + 1] ?? null
  if (!next) return { rank, next, pct: 100, remaining: 0 }
  return {
    rank,
    next,
    pct: Math.round(((points - rank.min) / (next.min - rank.min)) * 100),
    remaining: next.min - points,
  }
}

export function starsFor(points: number): number {
  return Math.min(5, Math.floor(points / 60) + 1)
}

// ---------- Journal stats ----------

export interface StudentStats {
  totalLessons: number
  grade5: number
  grade4: number
  attended: number
  late: number
  missed: number
  /** 0–100, present (keldi + kechikdi) share of all recorded lessons. */
  attendancePct: number
  /** Longest run of lessons without a "kelmadi". */
  bestStreak: number
}

export function computeStats(entries: JournalEntry[]): StudentStats {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  let grade5 = 0
  let grade4 = 0
  let attended = 0
  let late = 0
  let missed = 0
  let best = 0
  let run = 0
  for (const e of sorted) {
    if (e.grade === 5) grade5++
    if (e.grade === 4) grade4++
    if (e.attendance === 'kelmadi') {
      missed++
      run = 0
    } else {
      if (e.attendance === 'kechikdi') late++
      else attended++
      run++
      best = Math.max(best, run)
    }
  }
  const total = sorted.length
  const present = attended + late
  return {
    totalLessons: total,
    grade5,
    grade4,
    attended,
    late,
    missed,
    attendancePct: total ? Math.round((present / total) * 100) : 0,
    bestStreak: best,
  }
}

// ---------- Achievements (yutuqlar) ----------

interface AchievementCtx {
  student: Student
  stats: StudentStats
  /** 1-based leaderboard position, 0 when unknown. */
  position: number
}

export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: LucideIcon
  /** Unlocked tile accent classes. */
  tone: string
  target: number
  value: (ctx: AchievementCtx) => number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-step',
    name: 'Ilk qadam',
    description: 'Birinchi darsda qatnashish',
    icon: Footprints,
    tone: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300',
    target: 1,
    value: ({ stats }) => stats.totalLessons,
  },
  {
    id: 'five-stars',
    name: 'A‘lochi',
    description: '5 ta «5» baho olish',
    icon: Star,
    tone: 'border-amber-400/40 bg-amber-500/10 text-amber-500 dark:text-amber-300',
    target: 5,
    value: ({ stats }) => stats.grade5,
  },
  {
    id: 'scholar',
    name: 'Bilim sohibi',
    description: '15 ta «5» baho olish',
    icon: GraduationCap,
    tone: 'border-indigo-400/40 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300',
    target: 15,
    value: ({ stats }) => stats.grade5,
  },
  {
    id: 'streak-5',
    name: 'Olovli seriya',
    description: '5 dars ketma-ket qatnashish',
    icon: Flame,
    tone: 'border-orange-400/40 bg-orange-500/10 text-orange-500 dark:text-orange-300',
    target: 5,
    value: ({ stats }) => stats.bestStreak,
  },
  {
    id: 'streak-10',
    name: 'To‘xtatib bo‘lmas',
    description: '10 dars ketma-ket qatnashish',
    icon: Zap,
    tone: 'border-yellow-400/40 bg-yellow-500/10 text-yellow-500 dark:text-yellow-300',
    target: 10,
    value: ({ stats }) => stats.bestStreak,
  },
  {
    id: 'attendance-90',
    name: 'Davomat qahramoni',
    description: 'Kamida 5 darsda 90% davomat',
    icon: CalendarCheck,
    tone: 'border-teal-400/40 bg-teal-500/10 text-teal-500 dark:text-teal-300',
    target: 90,
    value: ({ stats }) => (stats.totalLessons >= 5 ? stats.attendancePct : 0),
  },
  {
    id: 'points-100',
    name: 'Yuzlik klubi',
    description: '100 ball to‘plash',
    icon: Coins,
    tone: 'border-lime-400/40 bg-lime-500/10 text-lime-600 dark:text-lime-300',
    target: 100,
    value: ({ student }) => student.points,
  },
  {
    id: 'points-300',
    name: 'Ball ovchisi',
    description: '300 ball to‘plash',
    icon: Target,
    tone: 'border-sky-400/40 bg-sky-500/10 text-sky-500 dark:text-sky-300',
    target: 300,
    value: ({ student }) => student.points,
  },
  {
    id: 'points-600',
    name: 'Chempion',
    description: '600 ball to‘plash',
    icon: Trophy,
    tone: 'border-amber-400/40 bg-amber-500/10 text-amber-500 dark:text-amber-300',
    target: 600,
    value: ({ student }) => student.points,
  },
  {
    id: 'collector',
    name: 'Kolleksioner',
    description: '3 xil nishon yig‘ish',
    icon: Award,
    tone: 'border-rose-400/40 bg-rose-500/10 text-rose-500 dark:text-rose-300',
    target: 3,
    value: ({ student }) => student.badges.length,
  },
  {
    id: 'top-3',
    name: 'Peshqadam',
    description: 'Reytingda top-3 ga kirish',
    icon: Crown,
    tone: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-500 dark:text-fuchsia-300',
    target: 1,
    value: ({ position }) => (position > 0 && position <= 3 ? 1 : 0),
  },
]

export interface AchievementState {
  def: AchievementDef
  value: number
  unlocked: boolean
  /** 0–100 progress towards the target. */
  pct: number
}

export function evaluateAchievements(
  student: Student,
  stats: StudentStats,
  position: number,
): AchievementState[] {
  return ACHIEVEMENTS.map((def) => {
    const value = def.value({ student, stats, position })
    return {
      def,
      value,
      unlocked: value >= def.target,
      pct: Math.min(100, Math.round((value / def.target) * 100)),
    }
  })
}
