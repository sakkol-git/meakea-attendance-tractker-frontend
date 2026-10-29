import { describe, expect, it } from 'vitest'
import { WorkspaceApi } from '../../app/api/workspace'
import type { DataRequest, DataSource, Json } from '../../app/data/source'

function remote(reply: (request: DataRequest) => Json) {
  const requests: DataRequest[] = []
  const source: DataSource = {
    mode: 'remote',
    async send(request) {
      requests.push(request)
      return { status: 200, data: reply(request) }
    },
  }
  return { api: new WorkspaceApi(source), requests }
}
const type = (code: string) => ({
  id: code.toLowerCase(),
  name: `${code} leave`,
  code,
  daysAllowed: 0,
  paid: false,
  allowHalfDay: true,
  evidenceRequired: false,
  minimumNoticeDays: 0,
  carryOverMax: 0,
})
const input = { type: 'UNPAID', startDate: '2026-11-02', endDate: '2026-11-02', portion: 'MORNING' }
const preview = {
  chargeableDays: 0.5,
  balanceBefore: null,
  balanceAfter: null,
  balanceTracked: false,
  allowHalfDay: true,
  evidenceRequired: false,
  minimumNoticeDays: 0,
  warnings: [],
}

describe('remote leave owner adapter', () => {
  it('requests explicit pages for own and pending leaves and balances', async () => {
    const { api, requests } = remote(() => ({ items: [], page: 0, size: 25, total: 0 }))
    await api.list('myLeaves')
    await api.list('pendingLeaves')
    await api.balances(2026)
    expect(requests.map((r) => r.query)).toEqual([
      { page: '0', size: '25' },
      { page: '0', size: '25' },
      { year: '2026', page: '0', size: '25' },
    ])
  })
  it('returns all balance cards across owner pages instead of silently stopping at 25', async () => {
    const balances = Array.from({ length: 26 }, (_, index) => ({
      type: `TYPE_${index}`,
      available: index,
      pending: 0,
      unit: 'days',
      year: 2026,
    }))
    const { api, requests } = remote((request) => {
      const page = Number(request.query?.page)
      return { items: balances.slice(page * 25, (page + 1) * 25), page, size: 25, total: 26 }
    })
    expect((await api.balances(2026)).items).toHaveLength(26)
    expect(requests.map((request) => request.query?.page)).toEqual(['0', '1'])
  })
  it('loads real catalog codes across pages without substituting demo types', async () => {
    const catalog = [
      ...Array.from({ length: 100 }, (_, index) => type(`TYPE_${index}`)),
      type('UNPAID'),
    ]
    const { api, requests } = remote((r) => ({
      items: catalog.slice(Number(r.query?.page) * 100, (Number(r.query?.page) + 1) * 100),
      page: Number(r.query?.page),
      size: 100,
      total: 101,
    }))
    expect((await api.leave.types()).map((t) => t.code)).toEqual(catalog.map((t) => t.code))
    expect(requests.every((r) => r.path === '/leave/types' && r.method === 'GET')).toBe(true)
  })
  it('uses owner-calculated half days and preserves explicitly untracked balances', async () => {
    const { api, requests } = remote(() => preview)
    expect(await api.leave.preview(input)).toEqual(preview)
    expect(requests[0]).toMatchObject({
      method: 'POST',
      path: '/leave/requests/preview',
      body: input,
    })
    expect(requests[0]?.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/)
  })
  it.each([
    { ...preview, balanceTracked: true },
    { ...preview, balanceBefore: 0 },
    { ...preview, balanceAfter: '0' },
    { ...preview, chargeableDays: -1 },
  ])('rejects inconsistent owner preview without demo fallback: %j', async (data) => {
    const { api } = remote(() => data)
    await expect(api.leave.preview(input)).rejects.toMatchObject({ code: 'CONTRACT_MISMATCH' })
  })
  it('does not present an incomplete catalog as complete', async () => {
    const { api } = remote(() => ({ items: [], page: 0, size: 100, total: 1 }))
    await expect(api.leave.types()).rejects.toMatchObject({ code: 'CONTRACT_MISMATCH' })
  })
})
