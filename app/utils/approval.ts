export interface ApprovalListQuery {
  search?: string
  status?: string
  minAgeDays?: number
  sort?: 'oldest' | 'newest'
  page?: number
  size?: number
  now?: Date
}

type ApprovalRow = Record<string, unknown> & { id: string }

export function approvalAgeDays(row: ApprovalRow, now = new Date()) {
  const created = Date.parse(String(row.createdAt ?? ''))
  if (!Number.isFinite(created)) return 0
  return Math.max(0, Math.floor((now.getTime() - created) / 86_400_000))
}

export function approvalExceptions(row: ApprovalRow): string[] {
  return Array.isArray(row.policyExceptions)
    ? row.policyExceptions.filter((value): value is string => typeof value === 'string')
    : []
}

/** Mirrors the API queue semantics in local mode: filter and sort before pagination. */
export function applyListQuery<T extends ApprovalRow>(rows: T[], query: ApprovalListQuery) {
  const search = query.search?.trim().toLocaleLowerCase() ?? ''
  let selected = rows.filter((row) => {
    if (query.status && row.status !== query.status) return false
    if ((query.minAgeDays ?? 0) > approvalAgeDays(row, query.now)) return false
    return !search || Object.values(row).join(' ').toLocaleLowerCase().includes(search)
  })
  if (query.sort) {
    const direction = query.sort === 'oldest' ? 1 : -1
    selected = selected.toSorted(
      (left, right) =>
        String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? '')) * direction,
    )
  }
  const total = selected.length
  const page = Math.max(0, query.page ?? 0)
  const size = Math.max(1, Math.min(100, query.size ?? (total || 1)))
  return { items: selected.slice(page * size, page * size + size), page, size, total }
}
