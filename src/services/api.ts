// Single API layer for the whole app — every request to the backend goes
// through `request()`, which attaches the Bearer token and normalizes errors
// ({ detail } messages come from the backend already in Uzbek).

import type {
  Attendance,
  BadgeDef,
  ClassGroup,
  GradeSummary,
  JournalColumn,
  JournalEntry,
  Lesson,
  QuarterInfo,
  SessionUser,
  Student,
  Teacher,
} from '../types'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'https://api.ilmkon-metodika.uz'
const TOKEN_KEY = 'mit:token'

// Drop the pre-backend localStorage database left by earlier builds
localStorage.removeItem('mit:db:v2')
localStorage.removeItem('mit:session:v2')

export function hasToken(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  let res: Response
  try {
    res = await fetch(BASE_URL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Server bilan aloqa yo‘q — internetni tekshiring')
  }
  // Expired/invalid token — drop it so the next app load lands on login
  if (res.status === 401 && token) localStorage.removeItem(TOKEN_KEY)
  if (res.status === 204) return null as T
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.detail ?? 'Xatolik yuz berdi')
  return data as T
}

// ---------- Auth & profile ----------

// PATCH /api/profile ignores empty strings, so a removed photo is stored as
// this sentinel on the backend and mapped back to '' whenever we read it.
const CLEARED_PHOTO = 'none'

function withPhoto<T extends { photo: string }>(obj: T): T {
  return obj.photo && !obj.photo.startsWith('data:') ? { ...obj, photo: '' } : obj
}

export async function login(loginName: string, password: string): Promise<SessionUser> {
  const { token, user } = await request<{ token: string; user: SessionUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginName.trim(), password }),
  })
  localStorage.setItem(TOKEN_KEY, token)
  return withPhoto(user)
}

/** Restores the session from the stored token (page refresh). */
export function getMe(): Promise<SessionUser> {
  return request<SessionUser>('/api/auth/me').then(withPhoto)
}

export function logout() {
  // JWT is stateless — dropping the token is enough; the call is best-effort
  request('/api/auth/logout', { method: 'POST' }).catch(() => {})
  localStorage.removeItem(TOKEN_KEY)
}

export interface ProfilePatch {
  name?: string
  phone?: string
  email?: string
  photo?: string
  password?: string
}

export function updateProfile(patch: ProfilePatch): Promise<SessionUser> {
  const body = { ...patch, ...(patch.photo === '' ? { photo: CLEARED_PHOTO } : {}) }
  return request<SessionUser>('/api/profile', { method: 'PATCH', body: JSON.stringify(body) }).then(withPhoto)
}

/** Extra profile fields only teachers have (phone/email). */
export function getTeacherProfile(id: string): Promise<Teacher | null> {
  return request<Teacher | null>(`/api/teachers/${id}/profile`).then((t) => (t ? withPhoto(t) : null))
}

// ---------- Lessons ----------

export function getGradeSummaries(): Promise<GradeSummary[]> {
  return request<GradeSummary[]>('/api/lessons/summary')
}

export function getLessonsByGrade(grade: number): Promise<Lesson[]> {
  return request<Lesson[]>(`/api/lessons?grade=${grade}`)
}

export function getLesson(id: string): Promise<Lesson> {
  return request<Lesson>(`/api/lessons/${id}`)
}

export interface NewLessonInput {
  grade: number
  quarter: number
  title: string
  durationMin?: number
}

/** The backend fills the lesson body from a template and sets the author from the token. */
export function addLesson(input: NewLessonInput): Promise<Lesson> {
  return request<Lesson>('/api/lessons', { method: 'POST', body: JSON.stringify(input) })
}

export function updateLesson(id: string, patch: Partial<Lesson>): Promise<Lesson> {
  return request<Lesson>(`/api/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export function deleteLesson(id: string): Promise<void> {
  return request<void>(`/api/lessons/${id}`, { method: 'DELETE' })
}

export function getQuarterInfos(grade: number): Promise<QuarterInfo[]> {
  return request<QuarterInfo[]>(`/api/quarters?grade=${grade}`)
}

// ---------- People & classes ----------

export function getClasses(): Promise<ClassGroup[]> {
  return request<ClassGroup[]>('/api/classes')
}

export function saveClass(data: Omit<ClassGroup, 'id'> & { id?: string }): Promise<ClassGroup> {
  const body = JSON.stringify({ grade: data.grade, letter: data.letter, teacherId: data.teacherId || null })
  return data.id
    ? request<ClassGroup>(`/api/classes/${data.id}`, { method: 'PATCH', body })
    : request<ClassGroup>('/api/classes', { method: 'POST', body })
}

export function deleteClass(id: string): Promise<void> {
  return request<void>(`/api/classes/${id}`, { method: 'DELETE' })
}

export function getTeachers(): Promise<Teacher[]> {
  return request<Teacher[]>('/api/teachers').then((list) => list.map(withPhoto))
}

export interface TeacherInput {
  id?: string
  name: string
  phone: string
  email: string
  classIds: string[]
  login: string
  password?: string
}

export function saveTeacher(data: TeacherInput): Promise<Teacher> {
  const { id, ...fields } = data
  const body = JSON.stringify(fields)
  return id
    ? request<Teacher>(`/api/teachers/${id}`, { method: 'PATCH', body })
    : request<Teacher>('/api/teachers', { method: 'POST', body })
}

export function deleteTeacher(id: string): Promise<void> {
  return request<void>(`/api/teachers/${id}`, { method: 'DELETE' })
}

export function getStudents(classId?: string): Promise<Student[]> {
  return request<Student[]>(`/api/students${classId ? `?classId=${classId}` : ''}`)
}

export function saveStudent(data: Omit<Student, 'id'> & { id?: string }): Promise<Student> {
  const { id, ...fields } = data
  const body = JSON.stringify(fields)
  return id
    ? request<Student>(`/api/students/${id}`, { method: 'PATCH', body })
    : request<Student>('/api/students', { method: 'POST', body })
}

export function deleteStudent(id: string): Promise<void> {
  return request<void>(`/api/students/${id}`, { method: 'DELETE' })
}

export function addPoints(studentId: string, points: number, badgeId?: string): Promise<Student> {
  return request<Student>(`/api/students/${studentId}/points`, {
    method: 'POST',
    body: JSON.stringify({ points, badgeId }),
  })
}

export function getBadgeDefs(): Promise<BadgeDef[]> {
  return request<BadgeDef[]>('/api/badges')
}

// ---------- Journal ----------

export function getJournal(classId: string): Promise<JournalEntry[]> {
  return request<JournalEntry[]>(`/api/journal?classId=${classId}`)
}

export function getJournalColumns(classId: string): Promise<JournalColumn[]> {
  return request<JournalColumn[]>(`/api/journal/columns?classId=${classId}`)
}

export function addJournalColumn(classId: string, date: string, lessonId: string): Promise<JournalColumn> {
  return request<JournalColumn>('/api/journal/columns', {
    method: 'POST',
    body: JSON.stringify({ classId, date, lessonId }),
  })
}

/**
 * Upserts a grade/attendance cell; the backend recalculates the student's
 * rating points and returns both the entry and the updated student.
 */
export function setJournalCell(
  classId: string,
  studentId: string,
  date: string,
  patch: { grade?: number | null; attendance?: Attendance },
): Promise<{ entry: JournalEntry; student: Student }> {
  return request<{ entry: JournalEntry; student: Student }>('/api/journal/cell', {
    method: 'PUT',
    body: JSON.stringify({ classId, studentId, date, ...patch }),
  })
}
