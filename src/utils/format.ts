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
  const [, m, d] = iso.split('-').map(Number)
  return `${d}-${MONTHS_UZ[m - 1]}`
}

/** "2026-05-12" -> "12-may, 2026" */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d}-${MONTHS_UZ[m - 1]}, ${y}`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
}
