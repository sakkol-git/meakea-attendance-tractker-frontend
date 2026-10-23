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
})
describe('remote command safety', () => {
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
  })
  it('uses the workspace date rather than UTC at midnight', () => {
    expect(tenantDay('2026-01-01T23:30:00Z', 'Asia/Phnom_Penh')).toBe('2026-01-02')
  })
  it('counts the documented demo working week and rejects excessive ranges', () => {
    expect(workingDays('2026-10-23', '2026-10-26')).toBe(2)
    expect(() => workingDays('2025-01-01', '2026-12-31')).toThrow()
  })
})
