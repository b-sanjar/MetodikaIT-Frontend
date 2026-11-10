import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { QUARTER_NAMES } from '../data/curriculum'

const QUARTER_STORAGE_KEY = 'mit:selected_quarter'

function getDefaultQuarter(): number {
  const saved = localStorage.getItem(QUARTER_STORAGE_KEY)
  if (saved) {
    const parsed = Number(saved)
    if (parsed >= 1 && parsed <= 4) return parsed
  }

  // Calculate based on calendar month
  const month = new Date().getMonth() // 0-based
  if (month >= 8 && month <= 9) return 1 // Sep, Oct
  if (month >= 10 && month <= 11) return 2 // Nov, Dec
  if (month >= 0 && month <= 2) return 3 // Jan, Feb, Mar
  if (month >= 3 && month <= 5) return 4 // Apr, May, Jun
  return 1 // Summer fallback
}

interface QuarterContextType {
  quarter: number
  setQuarter: (q: number) => void
  quarterName: string
  allQuarterNames: string[]
}

const QuarterContext = createContext<QuarterContextType | null>(null)

export function QuarterProvider({ children }: { children: ReactNode }) {
  const [quarter, setQuarterState] = useState<number>(getDefaultQuarter)

  const setQuarter = (q: number) => {
    const valid = Math.min(4, Math.max(1, q))
    setQuarterState(valid)
    try {
      localStorage.setItem(QUARTER_STORAGE_KEY, String(valid))
    } catch {}
  }

  useEffect(() => {
    try {
      localStorage.setItem(QUARTER_STORAGE_KEY, String(quarter))
    } catch {}
  }, [quarter])

  const quarterName = QUARTER_NAMES[quarter - 1] || `${quarter}-chorak`

  return (
    <QuarterContext.Provider
      value={{
        quarter,
        setQuarter,
        quarterName,
        allQuarterNames: QUARTER_NAMES,
      }}
    >
      {children}
    </QuarterContext.Provider>
  )
}

export function useQuarter(): QuarterContextType {
  const ctx = useContext(QuarterContext)
  if (!ctx) {
    // Graceful fallback if used outside provider
    const fallbackQ = getDefaultQuarter()
    return {
      quarter: fallbackQ,
      setQuarter: (q) => {
        try {
          localStorage.setItem(QUARTER_STORAGE_KEY, String(q))
        } catch {}
      },
      quarterName: QUARTER_NAMES[fallbackQ - 1] || `${fallbackQ}-chorak`,
      allQuarterNames: QUARTER_NAMES,
    }
  }
  return ctx
}

