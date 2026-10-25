export interface AbsenceEntry {
  id: string
  employeeName: string
  department?: string
  type: string
  status: string
  portion?: string
  startDate?: string
  endDate?: string
}

export interface CalendarDay {
  dateStr: string
  dayNumber: number
  isCurrentMonth: boolean
  isWeekend: boolean
  holidayName?: string
  absences: AbsenceEntry[]
  hasOverlap: boolean
}

export function isCoverageLow(
  day: Pick<CalendarDay, 'absences'>,
  teamSize: number,
  threshold: number,
) {
  return teamSize > 0 && day.absences.length / teamSize >= threshold
}

export function coverageLabel(
  day: Pick<CalendarDay, 'absences'>,
  teamSize: number,
  threshold: number,
) {
  return `${day.absences.length} of ${teamSize} off, coverage ${
    isCoverageLow(day, teamSize, threshold) ? 'low' : 'available'
  }`
}

/**
 * Builds a month grid aligned to 7 columns (Monday–Sunday) with padding days,
 * holiday markers, mapped employee absences, and overlap alerts (>= 2 absences).
 */
export function buildCalendarMonthGrid(
  year: number,
  month: number, // 0-indexed: 0 = Jan, 11 = Dec
  allAbsences: AbsenceEntry[],
  holidays: Map<string, string>,
): CalendarDay[] {
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1))
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0))

  // Week starts Monday (1) to Sunday (0)
  let startOffset = firstDayOfMonth.getUTCDay() - 1
  if (startOffset === -1) startOffset = 6

  const days: CalendarDay[] = []

  // Preceding padding days
  const prevMonthLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  for (let i = startOffset - 1; i >= 0; i--) {
    const padDay = prevMonthLastDay - i
    const dStr = new Date(Date.UTC(year, month - 1, padDay)).toISOString().slice(0, 10)
    days.push({
      dateStr: dStr,
      dayNumber: padDay,
      isCurrentMonth: false,
      isWeekend: false,
      absences: [],
      hasOverlap: false,
    })
  }

  // Active month days
  for (let d = 1; d <= lastDayOfMonth.getUTCDate(); d++) {
    const dObj = new Date(Date.UTC(year, month, d))
    const dStr = dObj.toISOString().slice(0, 10)
    const dayOfWeek = dObj.getUTCDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    const dayAbsences = allAbsences.filter((leave) => {
      if (!leave.startDate || !leave.endDate) return false
      return dStr >= leave.startDate && dStr <= leave.endDate
    })

    days.push({
      dateStr: dStr,
      dayNumber: d,
      isCurrentMonth: true,
      isWeekend,
      holidayName: holidays.get(dStr),
      absences: dayAbsences,
      hasOverlap: dayAbsences.length >= 2,
    })
  }

  // Subsequent padding days to fill 7 columns
  const remainingCells = 7 - (days.length % 7)
  if (remainingCells < 7) {
    for (let i = 1; i <= remainingCells; i++) {
      const dStr = new Date(Date.UTC(year, month + 1, i)).toISOString().slice(0, 10)
      days.push({
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isWeekend: false,
        absences: [],
        hasOverlap: false,
      })
    }
  }

  return days
}
