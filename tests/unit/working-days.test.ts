import { describe, expect, it } from 'vitest'
import { calculateWorkingDays } from '../../app/utils/working-days'

describe('calculateWorkingDays engine', () => {
  it('calculates standard Monday to Friday working week as 5 days', () => {
    // 2026-10-26 (Monday) to 2026-10-30 (Friday)
    const result = calculateWorkingDays('2026-10-26', '2026-10-30')
    expect(result.valid).toBe(true)
    expect(result.days).toBe(5)
    expect(result.weekendDays).toBe(0)
    expect(result.holidayDays).toBe(0)
    expect(result.totalCalendarDays).toBe(5)
  })

  it('excludes weekend days over a two-week period', () => {
    // 2026-10-26 (Monday) to 2026-11-06 (Friday of next week) -> 12 calendar days (10 work days, 2 weekend days)
    const result = calculateWorkingDays('2026-10-26', '2026-11-06')
    expect(result.valid).toBe(true)
    expect(result.days).toBe(10)
    expect(result.weekendDays).toBe(2) // Oct 31, Nov 1
    expect(result.totalCalendarDays).toBe(12)
  })

  it('excludes designated public holidays from working days count', () => {
    // 2026-10-26 (Mon) to 2026-10-30 (Fri) with 2026-10-28 as a holiday
    const result = calculateWorkingDays('2026-10-26', '2026-10-30', 'FULL_DAY', ['2026-10-28'])
    expect(result.valid).toBe(true)
    expect(result.days).toBe(4)
    expect(result.holidayDays).toBe(1)
  })

  it('handles half-day morning/afternoon portions accurately', () => {
    // Single workday morning
    const single = calculateWorkingDays('2026-10-27', '2026-10-27', 'MORNING')
    expect(single.days).toBe(0.5)

    // Single weekend day morning should count 0
    const weekend = calculateWorkingDays('2026-10-31', '2026-10-31', 'MORNING')
    expect(weekend.days).toBe(0)
    expect(weekend.weekendDays).toBe(1)
  })

  it('returns invalid on invalid or reversed dates', () => {
    const reversed = calculateWorkingDays('2026-10-30', '2026-10-20')
    expect(reversed.valid).toBe(false)
    expect(reversed.error).toBe('End date must be on or after start date.')

    const empty = calculateWorkingDays('', '')
    expect(empty.valid).toBe(false)
  })
})
