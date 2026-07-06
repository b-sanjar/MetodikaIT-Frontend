/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react'
import * as api from '../services/api'
import type { SessionUser } from '../types'

interface AuthCtx {
  user: SessionUser | null
  isAdmin: boolean
  /** Admin yoki o‘qituvchi — baholash va rag‘batlantirish huquqi */
  canTeach: boolean
  login: (login: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (patch: api.ProfilePatch) => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => api.getSessionUser())

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
