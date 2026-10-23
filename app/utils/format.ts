import { format, parseISO, isValid, differenceInMinutes } from 'date-fns'
export const dateLabel = (value?: string, pattern = 'MMM d, yyyy') =>
  value && isValid(parseISO(value)) ? format(parseISO(value), pattern) : 'Not available'
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase()
export const titleCase = (value?: string) =>
  (value ?? 'Not recorded')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
export function duration(start: string, end: string | null) {
  if (!end) return 'In progress'
  const minutes = Math.max(0, differenceInMinutes(parseISO(end), parseISO(start)))
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
export function clockLabel(value?: string | null, timeZone = 'UTC') {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', timeZone }).format(
    new Date(value),
  )
}
export function csvCell(value: unknown) {
  let text = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
export const toCsv = (rows: unknown[][]) =>
  '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
export function safeDownloadUrl(url: string, apiBase: string, origin: string) {
  const parsed = new URL(url, origin)
  if (
    !['https:', 'http:'].includes(parsed.protocol) ||
    ![new URL(apiBase || origin).origin, origin].includes(parsed.origin)
  )
    throw new Error('The server returned an untrusted download URL.')
  return parsed.href
}

export function tenantDay(value: string, timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(new Date(value))
}
