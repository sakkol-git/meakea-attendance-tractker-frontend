export function recordedAttendanceRate(
  rows: { recorded: number; expected: number }[],
): number | null {
  const recorded = rows.reduce((sum, row) => sum + row.recorded, 0)
  const expected = rows.reduce((sum, row) => sum + row.expected, 0)
  return expected > 0 ? Math.round((recorded / expected) * 1000) / 10 : null
}
