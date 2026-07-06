// Single API layer for the whole app. Today it is backed by localStorage;
// swapping the `db` read/write pair for HTTP calls is the migration path
// to a real backend — page code never touches storage directly.

import {
  BADGES,
  CLASSES,
  TEACHERS,
  USERS,
  buildJournal,
  buildJournalColumns,
  buildLessons,
  buildQuarterInfos,
  buildStudents,
  generateLessonBody,
  seedAuthorFor,
} from '../data/seed'
import { cellPoints } from '../utils/points'
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
  User,
} from '../types'

const DB_KEY = 'mit:db:v2'
const SESSION_KEY = 'mit:session:v2'

interface DB {
  users: User[]
  teachers: Teacher[]
  classes: ClassGroup[]
  students: Student[]
  lessons: Lesson[]
  quarterInfos: QuarterInfo[]
  journal: JournalEntry[]
  journalColumns: JournalColumn[]
}

function seedDB(): DB {
  const students = buildStudents()
  return {
    users: USERS,
    teachers: TEACHERS,
    classes: CLASSES,
    students,
    lessons: buildLessons(),
    quarterInfos: buildQuarterInfos(),
    journal: buildJournal(students),
    journalColumns: buildJournalColumns(CLASSES),
  }
}

function readDB(): DB {
  const raw = localStorage.getItem(DB_KEY)
  if (raw) {
    try {
      const db = JSON.parse(raw) as DB
      // Older DBs predate lesson author fields (or an earlier migration credited
      // everything to the admin). Seed lessons (id: l-<grade>-<quarter>-<order>)
      // belong to the grade's class teacher; user-created ones fall back to the admin.
      const seedId = /^l-\d+-\d+-\d+$/
      let dirty = false
      db.lessons = db.lessons.map((l) => {
        const author = seedId.test(l.id)
          ? seedAuthorFor(l.grade)
          : { authorId: l.authorId || USERS[0].id, authorName: l.authorName || USERS[0].name }
        if (l.authorId === author.authorId && l.authorName === author.authorName) return l
        dirty = true
        return { ...l, ...author }
      })
      if (dirty) writeDB(db)
      return db
    } catch {
      // corrupted storage — fall through to reseed
    }
  }
  const db = seedDB()
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  return db
}

function writeDB(db: DB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// ---------- Auth & profile ----------

function toSession(u: User): SessionUser {
  return { id: u.id, name: u.name, login: u.login, role: u.role, title: u.title, photo: u.photo }
}

function teacherToSession(t: Teacher): SessionUser {
  return {
    id: t.id,
    name: t.name,
    login: t.login,
    role: 'teacher',
    title: 'Informatika o‘qituvchisi',
    photo: t.photo,
  }
}

export async function login(loginName: string, password: string): Promise<SessionUser> {
  await delay(400)
  const db = readDB()
  const name = loginName.trim()
  const user = db.users.find((u) => u.login === name && u.password === password)
  if (user) {
    localStorage.setItem(SESSION_KEY, `u:${user.id}`)
    return toSession(user)
  }
  const teacher = db.teachers.find((t) => t.login === name && t.password === password)
  if (teacher) {
    localStorage.setItem(SESSION_KEY, `t:${teacher.id}`)
    return teacherToSession(teacher)
  }
  throw new Error('Login yoki parol noto‘g‘ri')
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  const [kind, id] = raw.split(':')
  const db = readDB()
  if (kind === 't') {
    const t = db.teachers.find((x) => x.id === id)
    return t ? teacherToSession(t) : null
  }
  const u = db.users.find((x) => x.id === id)
  return u ? toSession(u) : null
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export interface ProfilePatch {
  name?: string
  phone?: string
  email?: string
  photo?: string
  password?: string
}

/** Updates the currently logged-in account (admin/viewer user or teacher). */
export async function updateProfile(patch: ProfilePatch): Promise<SessionUser> {
  await delay(300)
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) throw new Error('Sessiya topilmadi — qaytadan kiring')
  const [kind, id] = raw.split(':')
  const db = readDB()
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== ''))
  if (kind === 't') {
    const i = db.teachers.findIndex((t) => t.id === id)
    if (i === -1) throw new Error('Profil topilmadi')
    db.teachers[i] = { ...db.teachers[i], ...clean, id }
    writeDB(db)
    return teacherToSession(db.teachers[i])
  }
  const i = db.users.findIndex((u) => u.id === id)
  if (i === -1) throw new Error('Profil topilmadi')
  db.users[i] = { ...db.users[i], ...clean, id }
  writeDB(db)
  return toSession(db.users[i])
}

/** Extra profile fields only teachers have (phone/email). */
export async function getTeacherProfile(id: string): Promise<Teacher | null> {
  await delay(150)
  return readDB().teachers.find((t) => t.id === id) ?? null
}

// ---------- Lessons ----------

export async function getGradeSummaries(): Promise<GradeSummary[]> {
  await delay()
  const { lessons } = readDB()
  const map = new Map<number, GradeSummary>()
  for (const l of lessons) {
    const s = map.get(l.grade) ?? { grade: l.grade, lessonCount: 0, readyCount: 0 }
    s.lessonCount += 1
    if (l.status === 'ready') s.readyCount += 1
    map.set(l.grade, s)
  }
  return [...map.values()].sort((a, b) => a.grade - b.grade)
}

export async function getLessonsByGrade(grade: number): Promise<Lesson[]> {
  await delay()
  return readDB()
    .lessons.filter((l) => l.grade === grade)
    .sort((a, b) => a.quarter - b.quarter || a.order - b.order)
}

export async function getLesson(id: string): Promise<Lesson> {
  await delay(200)
  const lesson = readDB().lessons.find((l) => l.id === id)
  if (!lesson) throw new Error('Dars topilmadi')
  return lesson
}

export interface NewLessonInput {
  grade: number
  quarter: number
  title: string
  durationMin?: number
}

/** Adds a lesson to the end of a quarter with a generated template body. */
export async function addLesson(input: NewLessonInput): Promise<Lesson> {
  await delay(250)
  const me = getSessionUser()
  if (!me) throw new Error('Sessiya topilmadi — qaytadan kiring')
  const db = readDB()
  const siblings = db.lessons.filter((l) => l.grade === input.grade && l.quarter === input.quarter)
  const order = Math.max(0, ...siblings.map((l) => l.order)) + 1
  const lesson: Lesson = {
    id: uid('l'),
    grade: input.grade,
    quarter: input.quarter,
    order,
    title: input.title,
    authorId: me.id,
    authorName: me.name,
    ...generateLessonBody(input.title, input.grade),
    videoUrl: '',
    durationMin: input.durationMin ?? 45,
    status: 'draft',
  }
  db.lessons.push(lesson)
  writeDB(db)
  return lesson
}

/** Only the admin or the lesson's author (teacher) may delete a lesson. */
export async function deleteLesson(id: string): Promise<void> {
  await delay(200)
  const db = readDB()
  const lesson = db.lessons.find((l) => l.id === id)
  if (!lesson) throw new Error('Dars topilmadi')
  const me = getSessionUser()
  if (!me || (me.role !== 'admin' && me.id !== lesson.authorId))
    throw new Error('Bu darsni faqat admin yoki uni yaratgan o‘qituvchi o‘chira oladi')
  if (db.journalColumns.some((c) => c.lessonId === id))
    throw new Error('Bu dars jurnalda o‘tilgan darslarga biriktirilgan — avval jurnalni tekshiring')
  db.lessons = db.lessons.filter((l) => l.id !== id)
  writeDB(db)
}

export async function updateLesson(id: string, patch: Partial<Lesson>): Promise<Lesson> {
  await delay(200)
  const db = readDB()
  const i = db.lessons.findIndex((l) => l.id === id)
  if (i === -1) throw new Error('Dars topilmadi')
  db.lessons[i] = { ...db.lessons[i], ...patch, id }
  writeDB(db)
  return db.lessons[i]
}

export async function getQuarterInfos(grade: number): Promise<QuarterInfo[]> {
  await delay(150)
  return readDB()
    .quarterInfos.filter((q) => q.grade === grade)
    .sort((a, b) => a.quarter - b.quarter)
}

// ---------- People & classes ----------

export async function getClasses(): Promise<ClassGroup[]> {
  await delay(150)
  return readDB().classes.sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter))
}

export async function saveClass(data: Omit<ClassGroup, 'id'> & { id?: string }): Promise<ClassGroup> {
  await delay(200)
  const db = readDB()
  let klass: ClassGroup
  if (data.id) {
    const i = db.classes.findIndex((c) => c.id === data.id)
    if (i === -1) throw new Error('Sinf topilmadi')
    db.classes[i] = { ...db.classes[i], ...data, id: data.id }
    klass = db.classes[i]
  } else {
    const exists = db.classes.some((c) => c.grade === data.grade && c.letter === data.letter)
    if (exists) throw new Error('Bunday sinf allaqachon mavjud')
    klass = { ...data, id: uid('c') }
    db.classes.push(klass)
  }
  // Keep teacher.classIds in sync with class.teacherId
  db.teachers = db.teachers.map((t) => {
    const has = t.classIds.includes(klass.id)
    if (t.id === klass.teacherId) return has ? t : { ...t, classIds: [...t.classIds, klass.id] }
    return has ? { ...t, classIds: t.classIds.filter((c) => c !== klass.id) } : t
  })
  writeDB(db)
  return klass
}

export async function deleteClass(id: string): Promise<void> {
  await delay(200)
  const db = readDB()
  if (db.students.some((s) => s.classId === id))
    throw new Error('Bu sinfda o‘quvchilar bor — avval ularni boshqa sinfga o‘tkazing')
  db.classes = db.classes.filter((c) => c.id !== id)
  db.teachers = db.teachers.map((t) =>
    t.classIds.includes(id) ? { ...t, classIds: t.classIds.filter((c) => c !== id) } : t,
  )
  db.journal = db.journal.filter((j) => j.classId !== id)
  db.journalColumns = db.journalColumns.filter((j) => j.classId !== id)
  writeDB(db)
}

export async function getTeachers(): Promise<Teacher[]> {
  await delay()
  return readDB().teachers
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

export async function saveTeacher(data: TeacherInput): Promise<Teacher> {
  await delay(200)
  const db = readDB()
  const loginTaken =
    db.teachers.some((t) => t.login === data.login && t.id !== data.id) ||
    db.users.some((u) => u.login === data.login)
  if (loginTaken) throw new Error('Bu login band — boshqasini tanlang')
  if (data.id) {
    const i = db.teachers.findIndex((t) => t.id === data.id)
    if (i === -1) throw new Error('O‘qituvchi topilmadi')
    db.teachers[i] = {
      ...db.teachers[i],
      ...data,
      id: data.id,
      password: data.password || db.teachers[i].password,
    }
    writeDB(db)
    return db.teachers[i]
  }
  if (!data.password) throw new Error('Yangi o‘qituvchi uchun parol kiritilishi shart')
  const teacher: Teacher = { ...data, password: data.password, id: uid('t'), photo: '' }
  db.teachers.push(teacher)
  writeDB(db)
  return teacher
}

export async function deleteTeacher(id: string): Promise<void> {
  await delay(200)
  const db = readDB()
  db.teachers = db.teachers.filter((t) => t.id !== id)
  writeDB(db)
}

export async function getStudents(classId?: string): Promise<Student[]> {
  await delay()
  const { students } = readDB()
  return classId ? students.filter((s) => s.classId === classId) : students
}

export async function saveStudent(data: Omit<Student, 'id'> & { id?: string }): Promise<Student> {
  await delay(200)
  const db = readDB()
  if (data.id) {
    const i = db.students.findIndex((s) => s.id === data.id)
    if (i === -1) throw new Error('O‘quvchi topilmadi')
    db.students[i] = { ...db.students[i], ...data, id: data.id }
    writeDB(db)
    return db.students[i]
  }
  const student: Student = { ...data, id: uid('s') }
  db.students.push(student)
  writeDB(db)
  return student
}

export async function deleteStudent(id: string): Promise<void> {
  await delay(200)
  const db = readDB()
  db.students = db.students.filter((s) => s.id !== id)
  db.journal = db.journal.filter((j) => j.studentId !== id)
  writeDB(db)
}

export async function addPoints(studentId: string, points: number, badgeId?: string): Promise<Student> {
  await delay(150)
  const db = readDB()
  const i = db.students.findIndex((s) => s.id === studentId)
  if (i === -1) throw new Error('O‘quvchi topilmadi')
  const s = db.students[i]
  const badges = badgeId && !s.badges.includes(badgeId) ? [...s.badges, badgeId] : s.badges
  db.students[i] = { ...s, points: Math.max(0, s.points + points), badges }
  writeDB(db)
  return db.students[i]
}

export function getBadgeDefs(): BadgeDef[] {
  return BADGES
}

// ---------- Journal ----------

export async function getJournal(classId: string): Promise<JournalEntry[]> {
  await delay()
  return readDB().journal.filter((j) => j.classId === classId)
}

export async function getJournalColumns(classId: string): Promise<JournalColumn[]> {
  await delay(120)
  return readDB()
    .journalColumns.filter((c) => c.classId === classId)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function addJournalColumn(classId: string, date: string, lessonId: string): Promise<JournalColumn> {
  await delay(200)
  const db = readDB()
  if (db.journalColumns.some((c) => c.classId === classId && c.date === date))
    throw new Error('Bu sana uchun dars allaqachon ochilgan')
  const column: JournalColumn = { id: `jc-${classId}-${date}`, classId, date, lessonId }
  db.journalColumns.push(column)
  writeDB(db)
  return column
}

/**
 * Saves a grade/attendance cell and applies the rating-point delta to the
 * student (see utils/points.ts for the rules).
 */
export async function setJournalCell(
  classId: string,
  studentId: string,
  date: string,
  patch: { grade?: number | null; attendance?: Attendance },
): Promise<{ entry: JournalEntry; student: Student }> {
  await delay(120)
  const db = readDB()
  const id = `j-${studentId}-${date}`
  const i = db.journal.findIndex((j) => j.id === id)
  const prev = i === -1 ? null : db.journal[i]
  const entry: JournalEntry = {
    id,
    classId,
    studentId,
    date,
    grade: patch.grade !== undefined ? patch.grade : (prev?.grade ?? null),
    attendance: patch.attendance ?? prev?.attendance ?? 'keldi',
  }
  if (i === -1) db.journal.push(entry)
  else db.journal[i] = entry

  const si = db.students.findIndex((s) => s.id === studentId)
  if (si === -1) throw new Error('O‘quvchi topilmadi')
  const oldPts = prev ? cellPoints(prev.grade, prev.attendance) : 0
  const newPts = cellPoints(entry.grade, entry.attendance)
  db.students[si] = {
    ...db.students[si],
    points: Math.max(0, db.students[si].points + (newPts - oldPts)),
  }
  writeDB(db)
  return { entry, student: db.students[si] }
}

// ---------- Danger zone ----------

export function resetDemoData() {
  localStorage.removeItem(DB_KEY)
}
