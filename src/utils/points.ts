import type { Attendance } from '../types'

// Single source of truth for how students earn rating points.
export const GRADE_POINTS: Record<number, number> = { 5: 15, 4: 10, 3: 5, 2: 0 }

export const ATTENDANCE_POINTS: Record<Attendance, number> = { keldi: 2, kechikdi: 1, kelmadi: 0 }

export function cellPoints(grade: number | null, attendance: Attendance): number {
  return (grade ? (GRADE_POINTS[grade] ?? 0) : 0) + ATTENDANCE_POINTS[attendance]
}

export const POINT_RULES = [
  { label: 'Darsda «5» baho', value: '+15 ball' },
  { label: 'Darsda «4» baho', value: '+10 ball' },
  { label: 'Darsda «3» baho', value: '+5 ball' },
  { label: 'Darsga kelgani uchun', value: '+2 ball' },
  { label: 'Kechikib kelgani uchun', value: '+1 ball' },
  { label: 'O‘qituvchi rag‘bati (faollik, loyiha...)', value: '+5…+50 ball' },
]
