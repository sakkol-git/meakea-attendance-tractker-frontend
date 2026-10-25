import { describe, expect, it } from 'vitest'
import { WorkspaceApi } from '../../app/api/workspace'
import { WorkspaceDemoSource, workingDays } from '../../app/data/demo'
import { LocalDataSource } from '../../app/data/local'
import { DataFailure } from '../../app/data/source'
import type { DataRequest, DataSource } from '../../app/data/source'
import { csvCell, safeDownloadUrl, tenantDay } from '../../app/utils/format'
import { decode, Profile } from '../../app/schemas/contracts'

function fixture() {
  const demo = new WorkspaceDemoSource(new LocalDataSource())
  return { demo, api: new WorkspaceApi(demo) }
}
describe('workflow integration against explicit demo adapter', () => {
  it('creates a draft, submits it, then requires a manager and a current version to approve', async () => {
    const { demo, api } = fixture()
    const row = await api.create('requests', {
      title: 'A test monitor',
      type: 'Equipment',
      reason: 'A second screen for my desk.',
      quantity: 1,
    })
    expect(row.status).toBe('DRAFT')
    await api.change('requests', row.id, 'submit', row.version)
    await expect(api.change('requests', row.id, 'approve', 2)).rejects.toMatchObject({
      status: 403,
    })
    demo.setRole('MANAGER')
    await expect(api.change('requests', row.id, 'approve', 1)).rejects.toMatchObject({
      status: 412,
    })
    await api.change('requests', row.id, 'approve', 2)
    expect((await api.detail('requests', row.id)).row.status).toBe('APPROVED')
  })
  it('enforces admin access, duplicate email and stale record checks', async () => {
    const { demo, api } = fixture()
    await expect(api.list('employees')).rejects.toMatchObject({ status: 403 })
    demo.setRole('HR_ADMIN')
    const body = {
      name: 'Test Person',
      email: 'person@example.test',
      department: 'Engineering',
      position: 'Engineer',
    }
    const row = await api.create('employees', body)
    await expect(api.create('employees', body)).rejects.toMatchObject({ status: 409 })
    await api.update('employees', row.id, 1, { ...body, name: 'Updated Person' })
    await expect(api.update('employees', row.id, 1, body)).rejects.toMatchObject({ status: 412 })
  })
  it('rejects overlapping leave and tracks notification read state', async () => {
    const { api } = fixture()
    const first = (await api.list('myLeaves')).items[0]!
    await expect(
      api.create('leaves', {
        type: 'Annual leave',
        startDate: first.startDate!,
        endDate: first.endDate!,
        reason: 'A duplicate period request.',
      }),
    ).rejects.toMatchObject({ status: 409 })
    await api.readNotice()
    expect((await api.notices()).items.every((x) => x.read)).toBe(true)
  })
  it('requires version tokens for preferences', async () => {
    const { api } = fixture()
    const p = await api.preferences()
    await expect(
      api.savePreferences({ email: false, inApp: false, reminders: true }, p.etag),
    ).rejects.toMatchObject({ status: 422 })
    const saved = await api.savePreferences({ email: false, inApp: true, reminders: false }, p.etag)
    expect(saved.version).toBe(2)
    await expect(
      api.savePreferences({ email: true, inApp: true, reminders: true }, p.etag),
    ).rejects.toMatchObject({ status: 412 })
  })
  it('creates, protects and cancels an approval delegation', async () => {
    const { demo, api } = fixture()
    await expect(api.delegations()).rejects.toMatchObject({ status: 403 })
    demo.setRole('MANAGER')
    const candidates = await api.eligibleDelegates()
    expect(candidates.items.some((person) => person.id === 'demo-manager')).toBe(false)
    const row = await api.createDelegation({
      delegateId: 'demo-hr',
      startsOn: '2026-10-25',
      endsOn: '2026-10-31',
      reason: 'Annual leave coverage',
    })
    await expect(
      api.createDelegation({
        delegateId: 'demo-owner',
        startsOn: '2026-10-26',
        endsOn: '2026-10-27',
        reason: 'Overlapping coverage',
      }),
    ).rejects.toMatchObject({ status: 409 })
    const cancelled = await api.cancelDelegation(row.id, row.version)
    expect(cancelled.status).toBe('CANCELLED')
  })
})
describe('remote command safety', () => {
  it('polls asynchronous report exports and stops on a terminal failure', async () => {
    const calls: DataRequest[] = []
    let statusReads = 0
    const api = new WorkspaceApi(
      {
        mode: 'remote',
        async send(request) {
          calls.push(request)
          if (request.method === 'POST')
            return {
              status: 202,
              data: { id: 'export-1', status: 'PENDING', version: 1 },
            }
          statusReads += 1
          return {
            status: 200,
            data: {
              id: 'export-1',
              status: statusReads === 1 ? 'RUNNING' : 'FAILED',
              version: statusReads + 1,
            },
          }
        },
      },
      () => {},
      undefined,
      async () => {},
    )

    await expect(api.downloadLeaveReport('', 'https://hr.test')).rejects.toMatchObject({
      code: 'EXPORT_FAILED',
    })
    expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'POST /reports/exports',
      'GET /reports/exports/export-1',
      'GET /reports/exports/export-1',
    ])
    expect(calls[0]!.body).toEqual({ report: 'LEAVE', format: 'CSV' })
  })

  it('preserves the original attendance timestamp and key after an uncertain outcome', async () => {
    const calls: DataRequest[] = []
    const api = new WorkspaceApi({
      mode: 'remote',
      async send(r) {
        calls.push(structuredClone(r))
        if (calls.length === 1) throw new DataFailure(0, 'TIMEOUT', 'Unknown')
        return { status: 201, data: { id: 'session', version: 1 } }
      },
    })
    await expect(api.clock()).rejects.toThrow('Unknown')
    await new Promise((resolve) => setTimeout(resolve, 5))
    await api.clock()
    expect(calls[0]!.body).toEqual(calls[1]!.body)
    expect(calls[0]!.idempotencyKey).toBe(calls[1]!.idempotencyKey)
  })
  it('keeps an idempotency key after uncertain failure but clears after a confirmed result', async () => {
    const calls: DataRequest[] = []
    let fail = true
    const source: DataSource = {
      mode: 'remote',
      async send(r) {
        calls.push(r)
        if (fail) {
          fail = false
          throw new DataFailure(0, 'TIMEOUT', 'Unknown outcome')
        }
        return { status: 201, data: { id: 'x', version: 1 } }
      },
    }
    const api = new WorkspaceApi(source)
    await expect(api.create('requests', { title: 'test' })).rejects.toThrow('Unknown outcome')
    await api.create('requests', { title: 'test' })
    expect(calls[0]!.idempotencyKey).toBe(calls[1]!.idempotencyKey)
    await api.create('requests', { title: 'test' })
    expect(calls[2]!.idempotencyKey).not.toBe(calls[1]!.idempotencyKey)
  })
  it('blocks a mutation before sending when offline or CSRF is missing', async () => {
    let sent = false
    const api = new WorkspaceApi(
      {
        mode: 'remote',
        async send() {
          sent = true
          throw new Error('Unexpected call')
        },
      },
      () => {
        throw new Error('Offline')
      },
    )
    await expect(api.create('leaves', {})).rejects.toThrow('Offline')
    expect(sent).toBe(false)
  })
  it('supports pagination parameters in list queries', async () => {
    const { demo, api } = fixture()
    demo.setRole('HR_ADMIN')
    const full = await api.list('employees')
    expect(full.items.length).toBeGreaterThanOrEqual(2)
    const first = await api.list('employees', { page: 0, size: 1 })
    const second = await api.list('employees', { page: 1, size: 1 })
    expect(first.items).toEqual([full.items[0]])
    expect(second.items).toEqual([full.items[1]])
    expect(first.total).toBe(full.total)
    expect(second.total).toBe(full.total)
  })
  it('rejects invalid responses instead of substituting demo data', () => {
    expect(() => decode(Profile, {})).toThrow(DataFailure)
  })
})
describe('safe formatting', () => {
  it('neutralizes CSV formulas and embedded quotes', () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"')
    expect(csvCell('a"b')).toBe('"a""b"')
  })
  it('rejects external and script download URLs', () => {
    expect(() => safeDownloadUrl('javascript:alert(1)', '', 'https://hr.test')).toThrow()
    expect(() => safeDownloadUrl('https://evil.test/export', '', 'https://hr.test')).toThrow()
    expect(safeDownloadUrl('/export', '', 'https://hr.test')).toBe('https://hr.test/export')
    expect(
      safeDownloadUrl('https://files.hr.test/export', '', 'https://hr.test', [
        'https://files.hr.test',
      ]),
    ).toBe('https://files.hr.test/export')
  })
  it('uses the workspace date rather than UTC at midnight', () => {
    expect(tenantDay('2026-01-01T23:30:00Z', 'Asia/Phnom_Penh')).toBe('2026-01-02')
  })
  it('counts the documented demo working week and rejects excessive ranges', () => {
    expect(workingDays('2026-10-23', '2026-10-26')).toBe(2)
    expect(() => workingDays('2025-01-01', '2026-12-31')).toThrow()
  })
})
