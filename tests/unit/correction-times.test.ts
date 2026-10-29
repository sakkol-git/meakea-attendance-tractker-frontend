import { expect, it } from 'vitest'
import { correctionForm } from '../../app/schemas/forms'

it('preserves explicit correction instants and rejects reversed or zone-less times', () => {
  const request = {
    date: '2026-10-28',
    reason: 'Forgot to tap at the office.',
    proposedClockIn: '2026-10-28T08:00:00+07:00',
    proposedClockOut: '2026-10-28T17:00:00+07:00',
  }
  expect(correctionForm.parse(request)).toMatchObject(request)
  expect(
    correctionForm.safeParse({ ...request, proposedClockOut: '2026-10-28T07:00:00+07:00' }).success,
  ).toBe(false)
  expect(
    correctionForm.safeParse({ ...request, proposedClockIn: '2026-10-28T08:00:00' }).success,
  ).toBe(false)
})
