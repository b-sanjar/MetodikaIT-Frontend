import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import GradesPage from './pages/GradesPage'
import GradeDetailPage from './pages/GradeDetailPage'
import LessonPage from './pages/LessonPage'
import PresentationPage from './pages/PresentationPage'
import JournalPage from './pages/JournalPage'
import ClassesPage from './pages/ClassesPage'
import ProfilePage from './pages/ProfilePage'
import LeaderboardPage from './pages/LeaderboardPage'
import StudentsPage from './pages/StudentsPage'
import TeachersPage from './pages/TeachersPage'
import NotFoundPage from './pages/NotFoundPage'
import { Spinner } from './components/States'

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
          <Routes>
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
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
