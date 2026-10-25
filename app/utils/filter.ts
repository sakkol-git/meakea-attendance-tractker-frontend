/**
 * Case-insensitive match check of a search query against specified record properties.
 * If query is empty or whitespace-only, returns true.
 */
export function matchesQuery<T extends object>(
  record: T,
  fields: (keyof T | string)[],
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  return fields.some((field) => {
    const val = (record as Record<string, unknown>)[field as string]
    if (val === null || val === undefined) return false
    return String(val).toLowerCase().includes(q)
  })
}

/**
 * Filter an array of records against a search term across multiple fields.
 */
export function filterRecords<T extends object>(
  records: T[],
  fields: (keyof T | string)[],
  query: string,
): T[] {
  if (!query || !query.trim()) return records
  return records.filter((rec) => matchesQuery(rec, fields, query))
}
