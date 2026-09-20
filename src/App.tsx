import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
import { Spinner } from './components/States'

// Code splitting: lazy loaded route chunks
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const GradesPage = lazy(() => import('./pages/GradesPage'))
const GradeDetailPage = lazy(() => import('./pages/GradeDetailPage'))
const LessonPage = lazy(() => import('./pages/LessonPage'))
const PresentationPage = lazy(() => import('./pages/PresentationPage'))
const JournalPage = lazy(() => import('./pages/JournalPage'))
const ClassesPage = lazy(() => import('./pages/ClassesPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const StudentsPage = lazy(() => import('./pages/StudentsPage'))
const TeachersPage = lazy(() => import('./pages/TeachersPage'))
const SubjectsPage = lazy(() => import('./pages/SubjectsPage'))
const ParentPortalPage = lazy(() => import('./pages/ParentPortalPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function SuspenseFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
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
  if (!user) return <Navigate to="/kirish" replace />
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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              <Route path="/ota-ona" element={<ParentPortalPage />} />

              <Route element={<RedirectIfAuthed />}>
                <Route element={<AuthLayout />}>
                  <Route path="/kirish" element={<LoginPage />} />
                </Route>
              </Route>

              <Route element={<RequireAuth />}>
                {/* Presentation runs fullscreen, outside the main chrome */}
                <Route path="/dars/:id/taqdimot" element={<PresentationPage />} />

                <Route element={<MainLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/fanlar" element={<SubjectsPage />} />
                  <Route path="/darslar" element={<GradesPage />} />
                  <Route path="/darslar/:grade" element={<GradeDetailPage />} />
                  <Route path="/dars/:id" element={<LessonPage />} />
                  <Route path="/jurnal" element={<JournalPage />} />
                  <Route path="/reyting" element={<LeaderboardPage />} />
                  <Route element={<NoTeacher />}>
                    <Route path="/sinflar" element={<ClassesPage />} />
                    <Route path="/oqituvchilar" element={<TeachersPage />} />
                  </Route>
                  <Route path="/oquvchilar" element={<StudentsPage />} />
                  <Route path="/profil" element={<ProfilePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
