import { useCallback, useEffect, useState } from 'react'

interface Result<T> {
  key: string
  data: T | null
  error: string | null
}

/**
 * Runs an async loader and tracks loading/error state.
 * `loading` is derived: a result is only valid while its request key matches
 * the current deps+tick key, so re-renders never need a synchronous setState.
 */
export function useFetch<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [tick, setTick] = useState(0)
  const key = `${JSON.stringify(deps)}:${tick}`
  const [result, setResult] = useState<Result<T>>({ key: '', data: null, error: null })

  useEffect(() => {
    let alive = true
    loader()
      .then((data) => {
        if (alive) setResult({ key, data, error: null })
      })
      .catch((e: unknown) => {
        if (alive) setResult({ key, data: null, error: e instanceof Error ? e.message : 'Xatolik yuz berdi' })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const loading = result.key !== key
  const reload = useCallback(() => setTick((t) => t + 1), [])

  const setData = useCallback((updater: (prev: T) => T) => {
    setResult((r) => (r.data === null ? r : { ...r, data: updater(r.data) }))
  }, [])

  return {
    data: loading ? null : result.data,
    loading,
    error: loading ? null : result.error,
    reload,
    setData,
  }
}
