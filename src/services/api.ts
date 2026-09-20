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
  LeaderboardEntry,
  LeaderboardPeriod,
  Lesson,
  PointsEvent,
  PublicLeaderboardEntry,
  PublicMeta,
  PublicStudentData,
  QuarterInfo,
  SessionUser,
  Student,
  Subject,
  Teacher,
} from '../types'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'https://metodikait-backend.onrender.com'
const TOKEN_KEY = 'mit:token'
const PARENT_TOKEN_KEY = 'mit:parent_token'
const PARENT_CODE_KEY = 'mit:parent_code'

export function hasToken(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

const inFlightGets = new Map<string, Promise<any>>()

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isGet = !options.method || options.method.toUpperCase() === 'GET'
  if (isGet && inFlightGets.has(path)) {
    return inFlightGets.get(path) as Promise<T>
  }

  const userToken = localStorage.getItem(TOKEN_KEY)
  const parentToken = localStorage.getItem(PARENT_TOKEN_KEY)
  const parentCode = localStorage.getItem(PARENT_CODE_KEY)
  const activeToken = userToken || parentToken

  const reqPromise = (async () => {
    let res: Response
    try {
      res = await fetch(BASE_URL + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          ...(parentCode ? { 'X-Parent-Code': parentCode } : {}),
          ...options.headers,
        },
      })
    } catch {
      throw new Error('Server bilan aloqa yo‘q — internetni tekshiring')
    }
    // Expired/invalid token — drop it
    if (res.status === 401) {
      if (userToken) localStorage.removeItem(TOKEN_KEY)
      if (parentToken) localStorage.removeItem(PARENT_TOKEN_KEY)
    }
    if (res.status === 204) return null as T
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.detail ?? 'Xatolik yuz berdi')
    return data as T
  })()

  if (isGet) {
    inFlightGets.set(path, reqPromise)
    reqPromise.finally(() => inFlightGets.delete(path))
  }

  return reqPromise
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

export function getGradeSummaries(subjectId?: string): Promise<GradeSummary[]> {
  const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : ''
  return request<GradeSummary[]>(`/api/lessons/summary${query}`)
}

export function getLessonsByGrade(grade: number, subjectId?: string): Promise<Lesson[]> {
  const query = subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : ''
  return request<Lesson[]>(`/api/lessons?grade=${grade}${query}`)
}

export function getLesson(id: string): Promise<Lesson> {
  return request<Lesson>(`/api/lessons/${id}`)
}

export interface NewLessonInput {
  grade: number
  quarter: number
  title: string
  durationMin?: number
  subjectId?: string | null
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
  const body = JSON.stringify({
    grade: data.grade,
    letter: data.letter,
    teacherId: data.teacherId || null,
    tutorId: data.tutorId || null,
  })
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
  subjectId?: string | null
  subjectIds?: string[]
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

// ---------- Subjects ----------

let cachedSubjects: { data: Subject[]; time: number } | null = null

export function clearSubjectCache() {
  cachedSubjects = null
}

export async function getSubjects(): Promise<Subject[]> {
  const now = Date.now()
  if (cachedSubjects && now - cachedSubjects.time < 120_000) {
    return cachedSubjects.data
  }
  const subjects = await request<Subject[]>('/api/subjects')
  cachedSubjects = { data: subjects, time: now }
  return subjects
}

export function saveSubject(data: Partial<Subject> & { id?: string }): Promise<Subject> {
  clearSubjectCache()
  const { id, ...fields } = data
  const body = JSON.stringify(fields)
  return id
    ? request<Subject>(`/api/subjects/${id}`, { method: 'PATCH', body })
    : request<Subject>('/api/subjects', { method: 'POST', body })
}

export function deleteSubject(id: string): Promise<void> {
  clearSubjectCache()
  return request<void>(`/api/subjects/${id}`, { method: 'DELETE' })
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

export function addPoints(studentId: string, points: number, badgeId?: string, reason?: string): Promise<Student> {
  return request<Student>(`/api/students/${studentId}/points`, {
    method: 'POST',
    body: JSON.stringify({ points, badgeId, reason }),
  })
}

/** Recent point changes, newest first. */
export function getPointsHistory(studentId: string, limit = 20): Promise<PointsEvent[]> {
  return request<PointsEvent[]>(`/api/students/${studentId}/points-history?limit=${limit}`)
}

/** All journal entries of one student across every class, ordered by date. */
export function getStudentJournal(studentId: string): Promise<JournalEntry[]> {
  return request<JournalEntry[]>(`/api/students/${studentId}/journal`)
}

export function getLeaderboard(
  period: LeaderboardPeriod,
  classId?: string,
  subjectId?: string
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams()
  params.set('period', period)
  if (classId && classId !== 'all') params.set('classId', classId)
  if (subjectId && subjectId !== 'all') params.set('subjectId', subjectId)
  return request<LeaderboardEntry[]>(`/api/leaderboard?${params.toString()}`)
}

let cachedBadges: BadgeDef[] | null = null

export async function getBadgeDefs(): Promise<BadgeDef[]> {
  if (cachedBadges) return cachedBadges
  const badges = await request<BadgeDef[]>('/api/badges')
  cachedBadges = badges
  return badges
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

// ---------- Public Parent Portal ----------

export function getPublicMeta(): Promise<PublicMeta> {
  return request<PublicMeta>('/api/public/meta')
}

export function getPublicStudent(code: string): Promise<PublicStudentData> {
  return request<PublicStudentData>(`/api/public/student?code=${encodeURIComponent(code)}`)
}

export function getPublicLeaderboard(params: {
  scope?: 'school' | 'parallel' | 'class'
  grade?: number
  classId?: string
  subjectId?: string
  period?: LeaderboardPeriod
}): Promise<PublicLeaderboardEntry[]> {
  const qs = new URLSearchParams()
  if (params.scope) qs.set('scope', params.scope)
  if (params.grade) qs.set('grade', String(params.grade))
  if (params.classId && params.classId !== 'all') qs.set('classId', params.classId)
  if (params.subjectId && params.subjectId !== 'all') qs.set('subjectId', params.subjectId)
  if (params.period && params.period !== 'all') qs.set('period', params.period)

  const query = qs.toString() ? `?${qs.toString()}` : ''
  return request<PublicLeaderboardEntry[]>(`/api/public/leaderboard${query}`)
}

export async function verifyParentCode(code: string): Promise<{ token: string; student: PublicStudentData }> {
  const res = await request<{ token: string; student: PublicStudentData }>('/api/public/verify', {
    method: 'POST',
    body: JSON.stringify({ code: code.trim() }),
  })
  if (res && res.token) {
    localStorage.setItem(PARENT_TOKEN_KEY, res.token)
    localStorage.setItem(PARENT_CODE_KEY, code.trim())
  }
  return res
}

export function logoutParent(): void {
  localStorage.removeItem(PARENT_TOKEN_KEY)
  localStorage.removeItem(PARENT_CODE_KEY)
}

export function getParentCode(): string | null {
  return localStorage.getItem(PARENT_CODE_KEY)
}
