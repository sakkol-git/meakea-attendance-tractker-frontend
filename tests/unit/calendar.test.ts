import { describe, expect, it } from 'vitest'
import {
  buildCalendarMonthGrid,
  coverageLabel,
  isCoverageLow,
  type AbsenceEntry,
} from '../../app/utils/calendar'

describe('Calendar Month Grid utility', () => {
  it('generates complete 7-day aligned grid for October 2026', () => {
    const holidays = new Map([['2026-10-15', 'Mid-Month Holiday']])
    const absences: (AbsenceEntry & { startDate: string; endDate: string })[] = [
      {
        id: 'abs-1',
        employeeName: 'Alice',
        type: 'Annual',
        status: 'APPROVED',
        startDate: '2026-10-05',
        endDate: '2026-10-07',
      },
      {
        id: 'abs-2',
        employeeName: 'Bob',
        type: 'Sick',
        status: 'PENDING',
        startDate: '2026-10-06',
        endDate: '2026-10-06',
      },
    ]

    const grid = buildCalendarMonthGrid(2026, 9, absences, holidays) // month 9 is October

    // Grid length must be a multiple of 7 (complete weeks)
    expect(grid.length % 7).toBe(0)
    expect(grid.length).toBeGreaterThanOrEqual(28)

    // Check October 6 has overlap because Alice and Bob are both absent
    const oct6 = grid.find((d) => d.dateStr === '2026-10-06')
    expect(oct6).toBeDefined()
    expect(oct6?.absences).toHaveLength(2)
    expect(oct6?.hasOverlap).toBe(true)

    // Check holiday detection
    const oct15 = grid.find((d) => d.dateStr === '2026-10-15')
    expect(oct15?.holidayName).toBe('Mid-Month Holiday')

    // Check weekends
    const oct3 = grid.find((d) => d.dateStr === '2026-10-03') // Saturday
    expect(oct3?.isWeekend).toBe(true)
  })

  it('handles empty absences and holidays', () => {
    const grid = buildCalendarMonthGrid(2026, 0, [], new Map()) // January 2026
    expect(grid.length % 7).toBe(0)
    expect(grid.every((d) => !d.hasOverlap)).toBe(true)
  })

  it('states team coverage in accessible business terms', () => {
    const day = { absences: [{}, {}, {}] } as never
    expect(isCoverageLow(day, 10, 0.3)).toBe(true)
    expect(coverageLabel(day, 10, 0.3)).toBe('3 of 10 off, coverage low')
    expect(coverageLabel({ absences: [{}] } as never, 10, 0.3)).toBe(
      '1 of 10 off, coverage available',
    )
  })
})
