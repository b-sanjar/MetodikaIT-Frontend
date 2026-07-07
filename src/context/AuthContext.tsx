/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from '../services/api'
import type { SessionUser } from '../types'

interface AuthCtx {
  user: SessionUser | null
  /** false while the session is being restored from the stored token */
  ready: boolean
  isAdmin: boolean
  /** Admin yoki o‘qituvchi — baholash va rag‘batlantirish huquqi */
  canTeach: boolean
  login: (login: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (patch: api.ProfilePatch) => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(() => !api.hasToken())

  useEffect(() => {
    if (ready) return
    api
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (loginName: string, password: string) => {
    setUser(await api.login(loginName, password))
  }

  const logout = () => {
    api.logout()
    setUser(null)
  }

  const updateProfile = async (patch: api.ProfilePatch) => {
    setUser(await api.updateProfile(patch))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        isAdmin: user?.role === 'admin',
        canTeach: user?.role === 'admin' || user?.role === 'teacher',
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
