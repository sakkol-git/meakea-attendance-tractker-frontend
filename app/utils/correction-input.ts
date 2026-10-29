export function correctionLocalTime(instant: string, timeZone: string): string {
  if (!instant || !timeZone) return ''
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(new Date(instant))
        .map(({ type, value }) => [type, value]),
    )
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
  } catch {
    return ''
  }
}

/** Resolve the selected wall clock only when it identifies one instant. */
export function correctionInstant(local: string, timeZone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || !timeZone) return null
  const nominal = Date.parse(`${local}:00Z`)
  if (!Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0, 16) !== local)
    return null
  const candidates = new Set<string>()
  // Inspect offsets on both sides of a nearby clock change, then round-trip.
  for (const hours of [-36, -12, 0, 12, 36]) {
    const probe = nominal + hours * 3_600_000
    const wall = correctionLocalTime(new Date(probe).toISOString(), timeZone)
    if (!wall) return null
    const offset = Date.parse(`${wall}:00Z`) - probe
    const candidate = new Date(nominal - offset).toISOString()
    if (correctionLocalTime(candidate, timeZone) === local) candidates.add(candidate)
  }
  return candidates.size === 1 ? [...candidates][0]! : null
}
