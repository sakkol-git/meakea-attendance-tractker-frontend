export type DayPortion = 'FULL_DAY' | 'MORNING' | 'AFTERNOON'

export interface WorkingDaysResult {
  days: number
  weekendDays: number
  holidayDays: number
  totalCalendarDays: number
  valid: boolean
  error?: string
}

/**
 * Calculates net working days between two calendar dates, skipping weekends
 * and designated company holiday dates.
 */
export function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
  portion: DayPortion = 'FULL_DAY',
  holidays: string[] = [],
): WorkingDaysResult {
  if (!startDateStr || !endDateStr) {
    return {
      days: 0,
      weekendDays: 0,
      holidayDays: 0,
      totalCalendarDays: 0,
      valid: false,
    }
  }

  const start = new Date(`${startDateStr}T12:00:00Z`)
  const end = new Date(`${endDateStr}T12:00:00Z`)

  if (!Number.isFinite(+start) || !Number.isFinite(+end)) {
    return {
      days: 0,
      weekendDays: 0,
      holidayDays: 0,
      totalCalendarDays: 0,
      valid: false,
      error: 'Please choose valid calendar dates.',
    }
  }

  if (end < start) {
    return {
      days: 0,
      weekendDays: 0,
      holidayDays: 0,
      totalCalendarDays: 0,
      valid: false,
      error: 'End date must be on or after start date.',
    }
  }

  const holidaySet = new Set(holidays)
  let workingDaysCount = 0
  let weekendDays = 0
  let holidayDays = 0
  let totalCalendarDays = 0

  const cursor = new Date(start)
  while (cursor <= end) {
    totalCalendarDays++
    const dayOfWeek = cursor.getUTCDay()
    const isoDate = cursor.toISOString().slice(0, 10)

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays++
    } else if (holidaySet.has(isoDate)) {
      holidayDays++
    } else {
      workingDaysCount++
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  // If half day on a single day, adjust to 0.5
  let days = workingDaysCount
  if (portion !== 'FULL_DAY') {
    if (totalCalendarDays === 1) {
      days = workingDaysCount > 0 ? 0.5 : 0
    } else {
      // If user selected multiple days with half-day portion,
      // first day or last day is half day:
      days = Math.max(0, workingDaysCount - 0.5)
    }
  }

  return {
    days,
    weekendDays,
    holidayDays,
    totalCalendarDays,
    valid: true,
  }
}
