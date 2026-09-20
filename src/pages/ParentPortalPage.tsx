import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  History,
  KeyRound,
  Layers,
  Lock,
  LogIn,
  LogOut,
  MonitorPlay,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react'
import * as api from '../services/api'
import { useTheme } from '../context/ThemeContext'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import { Input, Select } from '../components/Field'
import { ErrorState, Spinner } from '../components/States'
import { cn } from '../utils/cn'
import { formatDateShort } from '../utils/format'
import type {
  LeaderboardPeriod,
  PublicLeaderboardEntry,
  PublicMeta,
  PublicStudentData,
} from '../types'

const SCOPES = [
  { id: 'school', label: 'Butun maktab', icon: Trophy },
  { id: 'parallel', label: 'Tengdosh sinflar', icon: Layers },
  { id: 'class', label: 'O‘z sinfi', icon: Users },
] as const

type ScopeType = (typeof SCOPES)[number]['id']

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'all', label: 'Barcha vaqt' },
  { id: 'quarter', label: 'Chorak' },
  { id: 'month', label: 'Oylik' },
  { id: 'week', label: 'Haftalik' },
]

export default function ParentPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { theme, toggle } = useTheme()

  const urlCode = searchParams.get('code') || ''
  const storedCode = api.getParentCode() || ''
  const [pinInput, setPinInput] = useState(urlCode || storedCode)

  const [student, setStudent] = useState<PublicStudentData | null>(null)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const [meta, setMeta] = useState<PublicMeta | null>(null)

  // Leaderboard states (only active when student is verified)
  const [activeTab, setActiveTab] = useState<'reyting' | 'baholar' | 'tarix'>('reyting')
  const [scope, setScope] = useState<ScopeType>('parallel')
  const [subjectId, setSubjectId] = useState<string>('all')
  const [period, setPeriod] = useState<LeaderboardPeriod>('all')
  const [board, setBoard] = useState<PublicLeaderboardEntry[]>([])
  const [loadingBoard, setLoadingBoard] = useState(false)
  const [boardError, setBoardError] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)

  // 1. Initial verification if code is available in URL or Storage
  useEffect(() => {
    const codeToTry = urlCode || storedCode
    if (codeToTry.trim() && !student) {
      setLoadingVerify(true)
      setVerifyError(null)

      api
        .verifyParentCode(codeToTry.trim())
        .then(({ student: data }) => {
          setStudent(data)
          setPinInput(data.code)
        })
        .catch((err) => {
          setVerifyError(err instanceof Error ? err.message : 'Kiritilgan PIN-kod noto‘g‘ri')
          api.logoutParent()
        })
        .finally(() => {
          setLoadingVerify(false)
        })
    }
  }, [urlCode, storedCode, student])

  // 2. Load metadata once verified
  useEffect(() => {
    if (student) {
      api
        .getPublicMeta()
        .then(setMeta)
        .catch((err) => console.error('Meta load error:', err))
    }
  }, [student])

  // 3. Load leaderboard once verified
  useEffect(() => {
    if (!student) return

    setLoadingBoard(true)
    setBoardError(null)

    const params: Parameters<typeof api.getPublicLeaderboard>[0] = {
      scope,
      classId: student.classId,
      grade: student.grade,
      subjectId: subjectId === 'all' ? undefined : subjectId,
      period: period === 'all' ? undefined : period,
    }

    api
      .getPublicLeaderboard(params)
      .then(setBoard)
      .catch((err) => {
        setBoardError(err instanceof Error ? err.message : 'Reytingni yuklab bo‘lmadi')
      })
      .finally(() => {
        setLoadingBoard(false)
      })
  }, [student, scope, subjectId, period])

  // PIN submission
  const handleVerify = (e: FormEvent) => {
    e.preventDefault()
    const clean = pinInput.trim()
    if (!clean) return

    setLoadingVerify(true)
    setVerifyError(null)

    api
      .verifyParentCode(clean)
      .then(({ student: data }) => {
        setStudent(data)
        setSearchParams({ code: data.code }, { replace: true })
      })
      .catch((err) => {
        setStudent(null)
        setVerifyError(err instanceof Error ? err.message : 'Bunday PIN-kodli o‘quvchi topilmadi')
      })
      .finally(() => {
        setLoadingVerify(false)
      })
  }

  // Logout / Switch PIN
  const handleLogout = () => {
    api.logoutParent()
    setStudent(null)
    setPinInput('')
    setVerifyError(null)
    setSearchParams({}, { replace: true })
  }

  const handleCopyLink = () => {
    if (!student) return
    const url = `${window.location.origin}/ota-ona?code=${student.code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const childPositionInBoard = useMemo(() => {
    if (!student) return null
    const entry = board.find((b) => b.studentId === student.id || b.code === student.code)
    return entry?.position ?? null
  }, [board, student])

  return (
    <div className="app-bg isolate min-h-screen text-gray-900 dark:text-gray-100 selection:bg-primary-500/30">
      {/* Background aurora lights */}
      <div aria-hidden className="dot-grid pointer-events-none fixed inset-0 -z-10" />
      <div
        aria-hidden
        className="pointer-events-none fixed top-[8%] left-[25%] -z-10 h-96 w-96 rounded-full bg-primary-500/15 blur-[120px] dark:bg-primary-500/10"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-[30%] right-[15%] -z-10 h-80 w-80 rounded-full bg-violet-500/15 blur-[120px] dark:bg-violet-500/10"
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/75 backdrop-blur-xl dark:border-edge dark:bg-surface/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/ota-ona" className="flex items-center gap-3 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-violet-600 text-white shadow-lg shadow-primary-500/40 ring-1 ring-white/20 ring-inset group-hover:scale-105 transition-transform">
              <MonitorPlay size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-gray-900 dark:text-white">
                  Maktab Metodikasi
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  Ota-onalar portali
                </span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Xavfsiz va yopiq ta’lim monitoringi
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggle}
              aria-label="Mavzuni almashtirish"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200/80 bg-white/80 text-gray-600 transition-colors hover:bg-gray-100 dark:border-edge dark:bg-surface-2 dark:text-gray-300 dark:hover:bg-white/5 cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {student ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-edge dark:bg-surface-2 dark:text-gray-200 dark:hover:bg-white/5 cursor-pointer"
                title="PIN-kodni almashtirish yoki chiqish"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Chiqish (PINni almashtirish)</span>
                <span className="sm:hidden">Chiqish</span>
              </button>
            ) : (
              <Link
                to="/kirish"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-edge dark:bg-surface-2 dark:text-gray-200 dark:hover:bg-white/5"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">O‘qituvchi / Admin kirish</span>
                <span className="sm:hidden">Kirish</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        {/* ========================================================= */}
        {/* CASE 1: GATEKEEPER LOCK SCREEN (When no student is verified) */}
        {/* ========================================================= */}
        {!student ? (
          <div className="mx-auto max-w-md py-6 sm:py-12 animate-fade-in">
            <Card className="p-6 sm:p-8 text-center relative overflow-hidden border border-primary-500/20 shadow-2xl shadow-primary-500/10 backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary-500 to-violet-600 text-white shadow-xl shadow-primary-500/30 mb-5 animate-pop">
                <Lock size={30} />
              </div>

              <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Farzandingiz PIN-kodini kiriting
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Ushbu portal xavfsiz va yopiq tizimdir. Farzandingizning baholari, davomati va reytingini ko‘rish uchun sinf rahbari bergan maxsus PIN-kodni (masalan: AB-12345) kiriting.
              </p>

              <form onSubmit={handleVerify} className="mt-6 space-y-4">
                <div className="relative">
                  <Input
                    type="text"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                    placeholder="Masalan: AB-12345"
                    autoFocus
                    className="h-12 text-center font-mono text-xl tracking-wider uppercase font-bold placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:normal-case"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <KeyRound size={18} />
                  </span>
                </div>

                {verifyError && (
                  <div className="rounded-xl bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center gap-2 text-left">
                    <XCircle size={16} className="shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loadingVerify || !pinInput.trim()}
                  className="w-full h-11 text-sm font-semibold"
                >
                  {loadingVerify ? (
                    'PIN-kod tekshirilmoqda...'
                  ) : (
                    <>
                      Kirish va Natijalarni ko‘rish
                      <ArrowRight size={16} className="ml-1" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-gray-100 dark:border-edge text-center">
                <p className="text-[11px] text-gray-400 leading-normal">
                  PIN-kodni bilmasangiz, sinf rahbari yoki informatika o‘qituvchisiga murojaat qiling. Ular o‘z akkauntidan havola nusxalab berishlari mumkin.
                </p>
              </div>
            </Card>
          </div>
        ) : (
          /* ========================================================= */
          /* CASE 2: UNLOCKED PARENT PORTAL (Student Verified)         */
          /* ========================================================= */
          <div className="space-y-6 animate-fade-in">
            {/* Student Hero Header */}
            <div className="relative overflow-hidden rounded-2xl border border-primary-500/30 bg-linear-to-br from-primary-500/10 via-violet-500/10 to-transparent p-5 sm:p-6 backdrop-blur-xl shadow-xl shadow-primary-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <Avatar name={student.name} size="xl" className="ring-4 ring-primary-500/30 shadow-lg" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                        {student.name}
                      </h2>
                      <Chip tone="primary" className="text-xs">
                        {student.className} sinf
                      </Chip>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        PIN-kod: <strong className="font-mono text-gray-800 dark:text-gray-200">{student.code}</strong>
                      </span>
                      <button
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 cursor-pointer"
                      >
                        <Copy size={13} />
                        {copied ? 'Havola nusxalandi! ✓' : 'Havolani nusxalash'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Total Points Big Badge */}
                <div className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/60 px-4 py-3 shadow-md backdrop-blur-md dark:border-white/10 dark:bg-surface/60">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30">
                    <Trophy size={24} />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Jami to‘plagan ball</p>
                    <p className="font-display text-3xl font-extrabold text-gray-900 tabular-nums dark:text-white">
                      {student.points}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ranks Trio Cards */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200/60 bg-white/70 p-3.5 backdrop-blur-sm dark:border-white/5 dark:bg-surface-2/60">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Trophy size={14} className="text-amber-500" />
                      Maktab bo‘yicha
                    </span>
                    <span className="text-[11px]">jami {student.ranks.school.total}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                      #{student.ranks.school.position}
                    </span>
                    <span className="text-xs text-gray-400">-o‘rin</span>
                  </div>
                </div>

                <div className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-3.5 backdrop-blur-sm dark:border-primary-500/20 dark:bg-primary-500/10">
                  <div className="flex items-center justify-between text-xs text-primary-700 dark:text-primary-300 mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Layers size={14} className="text-primary-500" />
                      Tengdosh sinflarda ({student.grade}-sinflar)
                    </span>
                    <span className="text-[11px]">jami {student.ranks.parallel.total}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-2xl font-bold text-primary-600 dark:text-primary-400">
                      #{student.ranks.parallel.position}
                    </span>
                    <span className="text-xs text-primary-500/70">-o‘rin</span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200/60 bg-white/70 p-3.5 backdrop-blur-sm dark:border-white/5 dark:bg-surface-2/60">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users size={14} className="text-violet-500" />
                      O‘z sinfida ({student.className})
                    </span>
                    <span className="text-[11px]">jami {student.ranks.class.total}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                      #{student.ranks.class.position}
                    </span>
                    <span className="text-xs text-gray-400">-o‘rin</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-edge">
              <button
                onClick={() => setActiveTab('reyting')}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors cursor-pointer',
                  activeTab === 'reyting'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                <Trophy size={16} />
                Umumiy Reyting
              </button>

              <button
                onClick={() => setActiveTab('baholar')}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors cursor-pointer',
                  activeTab === 'baholar'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                <BookOpen size={16} />
                Baholar va Davomat
              </button>

              <button
                onClick={() => setActiveTab('tarix')}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors cursor-pointer',
                  activeTab === 'tarix'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                <History size={16} />
                Ballar tarixi
              </button>
            </div>

            {/* TAB 1: KENGAYTIRILGAN REYTING */}
            {activeTab === 'reyting' && (
              <div className="space-y-4 animate-fade-in">
                {/* Filter Bar with Scope, Subject and Period */}
                <Card className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* 1. Scope Pills (Butun maktab, Tengdosh sinflar, O'z sinfi) */}
                    <div className="flex flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-surface-2">
                      {SCOPES.map(({ id, label, icon: Icon }) => {
                        const active = scope === id
                        const displayLabel =
                          id === 'parallel'
                            ? `${student.grade}-sinflar`
                            : id === 'class'
                              ? `${student.className} sinf`
                              : label

                        return (
                          <button
                            key={id}
                            onClick={() => setScope(id)}
                            className={cn(
                              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                              active
                                ? 'bg-white text-gray-900 shadow-sm dark:bg-surface dark:text-white'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
                            )}
                          >
                            <Icon size={14} />
                            {displayLabel}
                          </button>
                        )
                      })}
                    </div>

                    {/* 2. Subject Filter & Period Filter */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        className="h-8 text-xs py-1 sm:w-44"
                      >
                        <option value="all">Barcha fanlar</option>
                        {meta?.subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>

                      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-surface-2">
                        {PERIODS.map(({ id, label }) => (
                          <button
                            key={id}
                            onClick={() => setPeriod(id)}
                            className={cn(
                              'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer',
                              period === id
                                ? 'bg-white text-gray-900 shadow-xs dark:bg-surface dark:text-white'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notice child position */}
                  {childPositionInBoard && (
                    <div className="flex items-center justify-between rounded-lg bg-primary-500/10 px-3 py-2 text-xs text-primary-700 dark:text-primary-300">
                      <span className="flex items-center gap-2">
                        <Sparkles size={14} className="text-primary-500" />
                        Farzandingiz ushbu saralash bo‘yicha <strong>#{childPositionInBoard}-o‘rinda</strong> bormoqda
                      </span>
                      <span className="text-[11px] opacity-80">Jami {board.length} nafar o‘quvchi orasida</span>
                    </div>
                  )}
                </Card>

                {/* Leaderboard Table */}
                {loadingBoard ? (
                  <div className="py-12 flex justify-center">
                    <Spinner />
                  </div>
                ) : boardError ? (
                  <ErrorState message={boardError} />
                ) : board.length === 0 ? (
                  <Card className="p-8 text-center text-sm text-gray-400">
                    Ushbu parametrlar bo‘yicha o‘quvchilar reytingi topilmadi
                  </Card>
                ) : (
                  <Card className="overflow-x-auto">
                    <table className="w-full min-w-120 text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left dark:border-edge text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          <th className="w-16 px-4 py-3">O‘rin</th>
                          <th className="px-4 py-3">O‘quvchi</th>
                          <th className="px-4 py-3">Sinf</th>
                          <th className="px-4 py-3 text-right">To‘plagan ball</th>
                        </tr>
                      </thead>
                      <tbody>
                        {board.map((item) => {
                          const isChild = item.studentId === student.id || item.code === student.code

                          return (
                            <tr
                              key={item.studentId}
                              className={cn(
                                'border-b border-gray-50 transition-colors last:border-0 dark:border-edge/50',
                                isChild
                                  ? 'bg-primary-500/15 font-semibold text-primary-950 dark:bg-primary-500/20 dark:text-primary-100 ring-1 ring-primary-500/30 ring-inset'
                                  : 'hover:bg-gray-50 dark:hover:bg-white/3',
                              )}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  {item.position === 1 ? (
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-white shadow-xs font-bold text-xs">
                                      1
                                    </span>
                                  ) : item.position === 2 ? (
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-gray-800 shadow-xs font-bold text-xs dark:bg-gray-500 dark:text-white">
                                      2
                                    </span>
                                  ) : item.position === 3 ? (
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white shadow-xs font-bold text-xs">
                                      3
                                    </span>
                                  ) : (
                                    <span className="font-mono text-xs text-gray-400 font-medium pl-1">
                                      #{item.position}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={item.name} size="sm" />
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {item.name}
                                    </span>
                                    {isChild && (
                                      <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-xs">
                                        Farzandingiz
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap">
                                <Chip tone={isChild ? 'primary' : 'gray'} className="text-xs">
                                  {item.className}
                                </Chip>
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums dark:text-white">
                                <span className={cn(isChild && 'text-primary-600 dark:text-primary-400 text-base')}>
                                  {item.points}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </Card>
                )}
              </div>
            )}

            {/* TAB 2: BAHOLAR VA DAVOMAT */}
            {activeTab === 'baholar' && (
              <div className="space-y-6 animate-fade-in">
                {/* Attendance Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Davomat darajasi</p>
                    <p className="font-display text-3xl font-extrabold text-emerald-500 tabular-nums">
                      {student.attendance.ratePercent}%
                    </p>
                  </Card>

                  <Card className="p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Jami darslar</p>
                    <p className="font-display text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {student.attendance.totalLessons}
                    </p>
                  </Card>

                  <Card className="p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Qatnashdi (Keldi)</p>
                    <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums flex items-center justify-center gap-1">
                      <CheckCircle2 size={18} />
                      {student.attendance.present}
                    </p>
                  </Card>

                  <Card className="p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Qoldirdi (Kelmadi)</p>
                    <p className="font-display text-2xl font-bold text-red-500 tabular-nums flex items-center justify-center gap-1">
                      <XCircle size={18} />
                      {student.attendance.absent}
                    </p>
                  </Card>
                </div>

                {/* Subject Grades Cards */}
                <div className="space-y-3">
                  <h3 className="font-display text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-primary-500" />
                    Fanlar kesimidagi ko‘rsatkichlar va baholar
                  </h3>

                  {student.subjectStats.length === 0 ? (
                    <Card className="p-6 text-center text-sm text-gray-400">
                      Hali elektron jurnalda baholar qayd etilmagan
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {student.subjectStats.map((sub) => (
                        <Card key={sub.subjectId} className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-400">
                                <BookOpen size={18} />
                              </span>
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">{sub.subjectName}</h4>
                                <p className="text-xs text-gray-400">To‘plangan ball: {sub.totalPoints}</p>
                              </div>
                            </div>

                            {sub.averageGrade !== null && (
                              <div className="text-right">
                                <span className="font-display text-xl font-bold text-amber-500 tabular-nums">
                                  {sub.averageGrade}
                                </span>
                                <p className="text-[10px] text-gray-400">O‘rtacha baho</p>
                              </div>
                            )}
                          </div>

                          {/* Grades badges list */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                              Jurnal baholari:
                            </p>
                            {sub.grades.length === 0 ? (
                              <span className="text-xs text-gray-400">Baholar yo‘q</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {sub.grades.map((grade, idx) => (
                                  <span
                                    key={idx}
                                    className={cn(
                                      'flex h-7 w-7 items-center justify-center rounded-md font-bold text-xs shadow-xs',
                                      grade === 5
                                        ? 'bg-emerald-500 text-white'
                                        : grade === 4
                                          ? 'bg-blue-500 text-white'
                                          : grade === 3
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-red-500 text-white',
                                    )}
                                  >
                                    {grade}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: BALLAR TARIXI */}
            {activeTab === 'tarix' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <History size={18} className="text-primary-500" />
                  Oxirgi berilgan rag‘bat va ballar tarixi
                </h3>

                {student.recentEvents.length === 0 ? (
                  <Card className="p-6 text-center text-sm text-gray-400">
                    Hozircha ballar tarixi mavjud emas
                  </Card>
                ) : (
                  <div className="space-y-2.5">
                    {student.recentEvents.map((ev) => (
                      <Card key={ev.id} className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs font-bold text-xs',
                              ev.delta > 0
                                ? 'bg-linear-to-br from-emerald-500 to-teal-600'
                                : 'bg-linear-to-br from-red-500 to-pink-600',
                            )}
                          >
                            {ev.delta > 0 ? `+${ev.delta}` : ev.delta}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {ev.reason || (ev.source === 'journal' ? 'Darsdagi baho va faollik uchun' : 'Rag‘batlantirish')}
                            </p>
                            <p className="text-xs text-gray-400">{formatDateShort(ev.date)}</p>
                          </div>
                        </div>

                        <Chip tone={ev.source === 'journal' ? 'gray' : 'primary'} className="text-xs">
                          {ev.source === 'journal' ? 'Jurnal' : 'Yutuq'}
                        </Chip>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
