import { DataFailure } from '../../../data/source'

export function workingDays(start: string, end: string, holidays: string[] = []) {
  let days = 0
  const cursor = new Date(`${start}T12:00:00Z`)
  const finish = new Date(`${end}T12:00:00Z`)
  if (
    !Number.isFinite(+cursor) ||
    !Number.isFinite(+finish) ||
    finish < cursor ||
    (+finish - +cursor) / 86400000 > 366
  )
    throw new DataFailure(422, 'INVALID_DATES', 'Choose a valid period of no more than one year.')
  while (cursor <= finish) {
    if (
      ![0, 6].includes(cursor.getUTCDay()) &&
      !holidays.includes(cursor.toISOString().slice(0, 10))
    )
      days++
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}
