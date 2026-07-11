import { useEffect, useState } from 'react'

/** Animates a number from 0 up to `target` with an ease-out curve. */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(Math.max(0, target) * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
