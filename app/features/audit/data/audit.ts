import { AuditEntry, decode, pagedCollection } from '../../../schemas/contracts'
import { DataFailure } from '../../../data/source'
import type { DataSource, RecordData } from '../../../data/source'

export type AuditOptions = {
  page: number
  size: number
  actor?: string
  action?: string
  target?: string
  from?: string
  to?: string
}

export async function fetchAuditLogs(source: DataSource, options: AuditOptions) {
  if (
    !Number.isInteger(options.page) ||
    options.page < 0 ||
    !Number.isInteger(options.size) ||
    options.size < 1 ||
    options.size > 100
  )
    throw new DataFailure(400, 'INVALID_PAGINATION', 'Use page 0 or higher and size 1–100.')
  const query = Object.fromEntries(
    Object.entries(options)
      .filter(([, value]) => value !== undefined && String(value).trim() !== '')
      .map(([key, value]) => [key, String(value).trim()]),
  )
  return decode(
    pagedCollection(AuditEntry),
    (await source.send({ method: 'GET', path: '/audit-logs', query })).data,
  )
}

export function demoAuditRows(query: Record<string, string> = {}, today = new Date()) {
  const isoDay = (offset: number) => {
    const value = new Date(today)
    value.setUTCDate(value.getUTCDate() + offset)
    return value.toISOString().slice(0, 10)
  }
  const rows: RecordData[] = [
    {
      id: 'audit-profile-updated',
      at: `${isoDay(-1)}T03:15:00.000Z`,
      actor: 'Kim Sreyneang',
      action: 'PROFILE_UPDATED',
      entityId: 'demo-employee',
      reason: 'Employee corrected their preferred name.',
      changes: { name: { before: 'Dara', after: 'Sok Dara' } },
    },
    {
      id: 'audit-request-approved',
      at: `${isoDay(-2)}T07:40:00.000Z`,
      actor: 'Chan Sopheak',
      action: 'REQUEST_APPROVED',
      entityId: 'request-demo',
      reason: 'Equipment request reviewed.',
    },
    {
      id: 'audit-login',
      at: `${isoDay(-3)}T01:05:00.000Z`,
      actor: 'Sok Dara',
      action: 'SESSION_STARTED',
      entityId: 'demo-employee',
    },
  ]
  return rows
    .filter(
      (row) =>
        (!query.actor || String(row.actor).toLowerCase().includes(query.actor.toLowerCase())) &&
        (!query.action || String(row.action).toLowerCase().includes(query.action.toLowerCase())) &&
        (!query.target ||
          String(row.entityId).toLowerCase().includes(query.target.toLowerCase())) &&
        (!query.from || String(row.at).slice(0, 10) >= query.from) &&
        (!query.to || String(row.at).slice(0, 10) <= query.to),
    )
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
}
