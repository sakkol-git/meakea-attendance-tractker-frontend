import { describe, expect, it } from 'vitest'
import { leaveForm } from '../../app/schemas/forms'

const request = {
  type: 'ANNUAL',
  portion: 'FULL_DAY',
  startDate: '2026-12-31',
  endDate: '2026-12-31',
  reason: 'Family appointment',
}

describe('leave form explains approved date restrictions before submission', () => {
  it('accepts a single-day half-day request', () => {
    expect(leaveForm.safeParse({ ...request, portion: 'MORNING' }).success).toBe(true)
  })
  it('points a cross-year request to the end date', () => {
    const result = leaveForm.safeParse({ ...request, endDate: '2027-01-02' })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['endDate'],
          message: 'Create a separate leave request for each calendar year.',
        }),
      )
  })
  it('explains why a multi-date half-day request cannot be sent', () => {
    const result = leaveForm.safeParse({
      ...request,
      startDate: '2026-12-30',
      portion: 'AFTERNOON',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['endDate'],
          message: 'Use the same start and end date for half-day leave.',
        }),
      )
  })
})
