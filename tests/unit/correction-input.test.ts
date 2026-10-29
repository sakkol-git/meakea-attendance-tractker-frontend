import { expect, it } from 'vitest'
import { correctionInstant, correctionLocalTime } from '../../app/utils/correction-input'

it('turns a company-clock selection into an explicit instant regardless of browser zone', () => {
  expect(correctionInstant('2026-10-28T08:30', 'Asia/Phnom_Penh')).toBe('2026-10-28T01:30:00.000Z')
  expect(correctionLocalTime('2026-10-28T01:30:00Z', 'Asia/Phnom_Penh')).toBe('2026-10-28T08:30')
})
it('preserves overnight dates when converting clock selections', () => {
  expect(correctionInstant('2026-10-29T02:00', 'Asia/Phnom_Penh')).toBe('2026-10-28T19:00:00.000Z')
})
it('does not invent an instant for missing zones, invalid dates or ambiguous daylight-saving times', () => {
  for (const [value, zone] of [
    ['2026-02-30T08:00', 'Asia/Phnom_Penh'],
    ['2026-10-28T08:00', ''],
    ['2026-03-08T02:30', 'America/New_York'],
    ['2026-11-01T01:30', 'America/New_York'],
  ])
    expect(correctionInstant(value!, zone!)).toBeNull()
})
