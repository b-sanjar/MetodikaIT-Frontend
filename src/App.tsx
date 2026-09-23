import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AuthLayout from './layouts/AuthLayout'
import MainLayout from './layouts/MainLayout'
import { Spinner } from './components/States'

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SubjectsPage = lazy(() => import('./pages/SubjectsPage'))
const GradesPage = lazy(() => import('./pages/GradesPage'))
const GradeDetailPage = lazy(() => import('./pages/GradeDetailPage'))
const LessonPage = lazy(() => import('./pages/LessonPage'))
const PresentationPage = lazy(() => import('./pages/PresentationPage'))
const JournalPage = lazy(() => import('./pages/JournalPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const ClassesPage = lazy(() => import('./pages/ClassesPage'))
const StudentsPage = lazy(() => import('./pages/StudentsPage'))
const TeachersPage = lazy(() => import('./pages/TeachersPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ParentPortalPage = lazy(() => import('./pages/ParentPortalPage'))

function SuspenseFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-gray-50 dark:bg-surface">
      <Spinner />
    </div>
  )
}

function RequireAuth() {
  const { user, ready } = useAuth()
  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    )
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function RedirectIfAuthed() {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

/** Sections teachers don't manage (classes, teacher accounts). */
function NoTeacher() {
  const { user } = useAuth()
  if (user?.role === 'teacher') return <Navigate to="/" replace />
  return <Outlet />
}

function RedirectLessonGrade() {
  const { grade } = useParams()
  return <Navigate to={`/lessons/${grade}`} replace />
}

function RedirectLesson() {
  const { id } = useParams()
  return <Navigate to={`/lessons/${id}`} replace />
}

function RedirectLessonPresentation() {
  const { id } = useParams()
  return <Navigate to={`/lessons/${id}/presentation`} replace />
}

function LessonOrGradeRoute() {
  const { slug } = useParams()
  if (slug && /^\d+$/.test(slug) && Number(slug) >= 1 && Number(slug) <= 11) {
    return <GradeDetailPage />
  }
  return <LessonPage />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              {/* Parent Portal */}
              <Route path="/parents" element={<ParentPortalPage />} />

              <Route element={<RedirectIfAuthed />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                </Route>
              </Route>

              <Route element={<RequireAuth />}>
                {/* Presentation runs fullscreen, outside the main chrome */}
                <Route path="/lessons/:id/presentation" element={<PresentationPage />} />

                <Route element={<MainLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/lessons" element={<GradesPage />} />
                  <Route path="/lessons/:slug" element={<LessonOrGradeRoute />} />
                  <Route path="/lesson/:id" element={<LessonPage />} />
                  <Route path="/journal" element={<JournalPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route element={<NoTeacher />}>
                    <Route path="/subjects" element={<SubjectsPage />} />
                    <Route path="/classes" element={<ClassesPage />} />
                    <Route path="/teachers" element={<TeachersPage />} />
                  </Route>
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>

              {/* Backward compatibility redirects for legacy / informal Uzbek URLs */}
              <Route path="/ota-ona" element={<Navigate to="/parents" replace />} />
              <Route path="/portal" element={<Navigate to="/parents" replace />} />
              <Route path="/kirish" element={<Navigate to="/login" replace />} />
              <Route path="/fanlar" element={<Navigate to="/subjects" replace />} />
              <Route path="/darslar" element={<Navigate to="/lessons" replace />} />
              <Route path="/darslar/:grade" element={<RedirectLessonGrade />} />
              <Route path="/dars/:id" element={<RedirectLesson />} />
              <Route path="/dars/:id/taqdimot" element={<RedirectLessonPresentation />} />
              <Route path="/jurnal" element={<Navigate to="/journal" replace />} />
              <Route path="/reyting" element={<Navigate to="/leaderboard" replace />} />
              <Route path="/sinflar" element={<Navigate to="/classes" replace />} />
              <Route path="/oqituvchilar" element={<Navigate to="/teachers" replace />} />
              <Route path="/oquvchilar" element={<Navigate to="/students" replace />} />
              <Route path="/profil" element={<Navigate to="/profile" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
