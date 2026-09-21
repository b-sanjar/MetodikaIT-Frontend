export type Role = 'admin' | 'teacher' | 'viewer'

export interface Subject {
  id: string
  name: string
  code: string
  description: string
  color: string
  icon: string
  order: number
  teacherCount?: number
  lessonCount?: number
}

export interface Teacher {
  id: string
  name: string
  phone: string
  email: string
  classIds: string[]
  login: string
  photo: string
  subjectId?: string | null
  subjectIds?: string[]
  subjectName?: string
  subjectNames?: string[]
}

/** Logged-in identity: an admin/viewer user or a teacher. */
export interface SessionUser {
  id: string
  name: string
  login: string
  role: Role
  title: string
  photo: string
  subjectId?: string | null
  subjectIds?: string[]
  subjectName?: string
  subjectNames?: string[]
  classIds?: string[]
}

export interface ClassGroup {
  id: string
  grade: number
  letter: string
  /** null — rahbari o‘chirilgan/biriktirilmagan sinf */
  teacherId: string | null
  tutorId: string | null
  teacherName?: string
  tutorName?: string
  leaderId?: string | null
  leaderName?: string
}

export interface Student {
  id: string
  name: string
  classId: string
  code?: string
  points: number
  badges: string[]
}

export interface PublicStudentRank {
  position: number
  total: number
}

export interface PublicStudentSubjectStat {
  subjectId: string
  subjectName: string
  color?: string
  icon?: string
  grades: number[]
  averageGrade: number | null
  totalPoints: number
}

export interface PublicStudentRecentEvent {
  id: string
  date: string
  delta: number
  source: 'journal' | 'reward'
  reason: string
  badgeId: string | null
}

export interface PublicStudentData {
  id: string
  name: string
  code: string
  classId: string
  className: string
  grade: number
  letter: string
  points: number
  badges: string[]
  ranks: {
    school: PublicStudentRank
    parallel: PublicStudentRank
    class: PublicStudentRank
  }
  attendance: {
    totalLessons: number
    present: number
    absent: number
    late: number
    ratePercent: number
  }
  subjectStats: PublicStudentSubjectStat[]
  recentEvents: PublicStudentRecentEvent[]
}

export interface PublicLeaderboardEntry {
  studentId: string
  name: string
  code: string
  classId: string
  className: string
  grade: number
  points: number
  position: number
}

export interface PublicMeta {
  subjects: { id: string; name: string; code?: string; icon?: string; color?: string }[]
  classes: { id: string; grade: number; letter: string; name: string }[]
}

export type LessonStatus = 'ready' | 'draft'

export interface Lesson {
  id: string
  grade: number
  quarter: number
  order: number
  title: string
  /** Who created the lesson — admin and the author may delete it. */
  authorId: string
  authorName: string
  objective: string
  theory: string[]
  practice: string[]
  homework: string
  equipment: string[]
  outcomes: string[]
  videoUrl: string
  durationMin: number
  status: LessonStatus
  subjectId?: string | null
  subjectName?: string
}

export interface QuarterInfo {
  grade: number
  quarter: number
  skills: string[]
}

export type Attendance = 'keldi' | 'kelmadi' | 'kechikdi'

/** One conducted lesson in a class journal: a date bound to the taught topic. */
export interface JournalColumn {
  id: string
  classId: string
  date: string
  lessonId: string
}

export interface JournalEntry {
  id: string
  studentId: string
  classId: string
  date: string
  grade: number | null
  attendance: Attendance
  needsWork?: boolean
  note?: string
}

export interface BadgeDef {
  id: string
  name: string
  description: string
}

/** One logged points change from /students/{id}/points-history. */
export interface PointsEvent {
  id: string
  date: string
  delta: number
  source: 'journal' | 'reward'
  reason: string
  /** Badge granted together with this event, if any. */
  badgeId: string | null
}

export type LeaderboardPeriod = 'week' | 'month' | 'quarter' | 'all'

export interface LeaderboardEntry {
  studentId: string
  /** Sum of point deltas within the selected period. */
  points: number
  position: number
}

export interface GradeSummary {
  grade: number
  lessonCount: number
  readyCount: number
}
