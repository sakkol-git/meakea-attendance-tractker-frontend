import { expect, test } from 'vitest'
import { recordedAttendanceRate } from '../../app/utils/report-summary'

test('missing expected sessions do not claim perfect attendance', () => {
  expect(recordedAttendanceRate([])).toBeNull()
  expect(recordedAttendanceRate([{ recorded: 0, expected: 0 }])).toBeNull()
})

test('attendance rates use combined counts rather than averaging percentages', () => {
  expect(
    recordedAttendanceRate([
      { recorded: 1, expected: 2 },
      { recorded: 8, expected: 8 },
    ]),
  ).toBe(90)
})
