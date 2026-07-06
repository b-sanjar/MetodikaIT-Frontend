import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Moon,
  School,
  Sun,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Avatar from '../components/Avatar'
import Chip from '../components/Chip'
import { cn } from '../utils/cn'

const NAV = [
  { to: '/', label: 'Bosh sahifa', icon: LayoutDashboard, end: true },
  { to: '/darslar', label: 'Darslar', icon: BookOpen },
  { to: '/jurnal', label: 'Jurnal', icon: ClipboardList },
  { to: '/reyting', label: 'Reyting', icon: Trophy },
  { to: '/sinflar', label: 'Sinflar', icon: School },
  { to: '/oquvchilar', label: 'O‘quvchilar', icon: Users },
  { to: '/oqituvchilar', label: 'O‘qituvchilar', icon: GraduationCap },
]

// Teachers work only with their lessons, journal and students
const TEACHER_HIDDEN = ['/sinflar', '/oqituvchilar']

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  teacher: 'O‘qituvchi',
  viewer: 'Kuzatuvchi',
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const items = NAV.filter((n) => !(user?.role === 'teacher' && TEACHER_HIDDEN.includes(n.to)))
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-linear-to-r from-primary-500 to-violet-600 text-white shadow-lg shadow-primary-500/30 ring-1 ring-white/20 ring-inset'
                : 'text-gray-500 hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={18} className={cn('transition-transform duration-200', !isActive && 'group-hover:scale-110')} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-violet-600 text-white shadow-lg shadow-primary-500/40 ring-1 ring-white/20 ring-inset">
        <MonitorPlay size={18} />
      </span>
      <div className="leading-tight">
        <p className="font-display text-sm font-semibold text-gray-900 dark:text-white">Metodika IT</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">Maktab platformasi</p>
      </div>
    </div>
  )
}

export default function MainLayout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)

  const onLogout = () => {
    logout()
    navigate('/kirish')
  }

  return (
    <div className="app-bg isolate min-h-screen text-gray-900 dark:text-gray-100">
      {/* Dot lattice + wandering aurora blobs behind the content (glass cards sample them) */}
      <div aria-hidden className="dot-grid pointer-events-none fixed inset-0 -z-10 print:hidden" />
      <div
        aria-hidden
        className="animate-drift pointer-events-none fixed top-[12%] left-[38%] -z-10 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-[110px] dark:bg-fuchsia-500/14 print:hidden"
        style={{ animationDelay: '-14s', animationDuration: '38s' }}
      />
      <div
        aria-hidden
        className="animate-drift pointer-events-none fixed -top-32 right-[8%] -z-10 h-96 w-120 rounded-full bg-primary-500/30 blur-[120px] dark:bg-primary-500/22 print:hidden"
      />
      <div
        aria-hidden
        className="animate-drift pointer-events-none fixed -bottom-32 left-[20%] -z-10 h-80 w-96 rounded-full bg-violet-500/25 blur-[110px] dark:bg-violet-500/16 print:hidden"
        style={{ animationDelay: '-9s', animationDuration: '32s' }}
      />
      <div
        aria-hidden
        className="animate-drift pointer-events-none fixed top-[40%] left-[55%] -z-10 h-64 w-64 rounded-full bg-sky-500/20 blur-[100px] dark:bg-sky-500/14 print:hidden"
        style={{ animationDelay: '-18s', animationDuration: '24s' }}
      />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 overflow-hidden border-r border-white/50 bg-white/55 py-6 backdrop-blur-2xl lg:flex dark:border-white/10 dark:bg-surface/55 print:hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-linear-to-b from-primary-500/12 via-violet-500/5 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/10"
        />
        <Brand />
        <div className="flex-1 overflow-y-auto px-3">
          <Nav />
        </div>
        <div className="border-t border-gray-200/70 px-3 pt-4 dark:border-edge">
          <div className="flex items-center gap-1">
            <Link
              to="/profil"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-900/5 dark:hover:bg-white/5"
              title="Profil"
            >
              <Avatar name={user?.name ?? '?'} photo={user?.photo} size="sm" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{user?.name}</span>
                <span className="block truncate text-[11px] text-gray-400">{user?.title}</span>
              </span>
            </Link>
            <button
              onClick={onLogout}
              aria-label="Chiqish"
              title="Chiqish"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="animate-rise absolute inset-y-0 left-0 flex w-72 flex-col gap-6 border-r border-gray-200 bg-white py-6 dark:border-edge dark:bg-surface">
            <div className="flex items-center justify-between pr-4">
              <Brand />
              <button
                onClick={() => setDrawer(false)}
                aria-label="Yopish"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <Nav onNavigate={() => setDrawer(false)} />
            </div>
            <div className="border-t border-gray-200/70 px-4 pt-4 dark:border-edge">
              <Link
                to="/profil"
                onClick={() => setDrawer(false)}
                className="flex items-center gap-3 rounded-lg py-1.5"
              >
                <Avatar name={user?.name ?? '?'} photo={user?.photo} size="sm" />
                <span className="leading-tight">
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">{user?.name}</span>
                  <span className="block text-[11px] text-gray-400">Profilni ochish</span>
                </span>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Topbar */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200/70 bg-white/60 px-4 backdrop-blur-xl sm:px-6 lg:pl-70 dark:border-edge dark:bg-ink/60 print:hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary-500/50 to-transparent"
        />
        <button
          onClick={() => setDrawer(true)}
          aria-label="Menyu"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-white/5 cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 lg:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-primary-500 to-violet-600 text-white">
            <MonitorPlay size={14} />
          </span>
          <span className="font-display text-sm font-semibold">Metodika IT</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user && (
            <Chip tone={user.role === 'admin' ? 'primary' : user.role === 'teacher' ? 'green' : 'gray'} dot className="hidden sm:inline-flex">
              {ROLE_LABELS[user.role]}
            </Chip>
          )}
          <button
            onClick={toggle}
            aria-label="Mavzuni almashtirish"
            title={theme === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘u rejim'}
            className="rounded-lg p-2 text-gray-500 transition-all hover:bg-gray-900/5 hover:text-gray-900 active:scale-90 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/profil" aria-label="Profil" className="rounded-full transition-transform hover:scale-105">
            <Avatar name={user?.name ?? '?'} photo={user?.photo} size="sm" />
          </Link>
          <button
            onClick={onLogout}
            aria-label="Chiqish"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-500 lg:hidden cursor-pointer"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:pl-70 lg:pr-8 print:p-0">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
