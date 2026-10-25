import { DataFailure } from './source.ts'

/** The shared API uses zero-based pages and sizes from 1 through 100. */
export function pageRows<T>(rows: T[], query?: Record<string, string>) {
  const page = Number(query?.page ?? 0)
  const size = Number(query?.size ?? Math.min(100, Math.max(1, rows.length)))
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100)
    throw new DataFailure(400, 'INVALID_PAGINATION', 'Use page 0 or higher and size 1–100.')
  return { items: rows.slice(page * size, (page + 1) * size), page, size, total: rows.length }
}
