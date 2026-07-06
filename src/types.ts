export type Role = 'admin' | 'teacher' | 'viewer'

export interface User {
  id: string
  name: string
  login: string
  password: string
  role: Role
  title: string
  photo: string
}

export interface Teacher {
  id: string
  name: string
  phone: string
  email: string
  classIds: string[]
  login: string
  password: string
  photo: string
}

/** Logged-in identity: an admin/viewer user or a teacher. */
export interface SessionUser {
  id: string
  name: string
  login: string
  role: Role
  title: string
  photo: string
}

export interface ClassGroup {
  id: string
  grade: number
  letter: string
  teacherId: string
}

export interface Student {
  id: string
  name: string
  classId: string
  points: number
  badges: string[]
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
}

export interface BadgeDef {
  id: string
  name: string
  description: string
}

export interface GradeSummary {
  grade: number
  lessonCount: number
  readyCount: number
}
