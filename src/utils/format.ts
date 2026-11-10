const MONTHS_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
]

/** "2026-05-12" -> "12-may" */
export function formatDateShort(iso: string): string {
  if (!iso || typeof iso !== 'string') return '—'
  const parts = iso.split('-').map(Number)
  if (parts.length < 3 || isNaN(parts[1]) || isNaN(parts[2])) return iso
  const [, m, d] = parts
  const monthName = MONTHS_UZ[m - 1] || ''
  return monthName ? `${d}-${monthName}` : iso
}

/** "2026-05-12" -> "12-may, 2026" */
export function formatDateLong(iso: string): string {
  if (!iso || typeof iso !== 'string') return '—'
  const parts = iso.split('-').map(Number)
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return iso
  const [y, m, d] = parts
  const monthName = MONTHS_UZ[m - 1] || ''
  return monthName ? `${d}-${monthName}, ${y}` : iso
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function initials(name: string): string {
  if (!name || typeof name !== 'string') return '?'
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  )
}
