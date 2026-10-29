import { describe, expect, it } from 'vitest'
import { RemoteDataSource } from '../app/data/remote'
import { WorkspaceApi } from '../app/api/workspace'
import { RemoteBusinessAdapter } from '../app/data/remote-business'
import {
  attachmentItems,
  privateAttachmentBytes,
} from '../app/features/requests/data/attachment-records'
import { commandKey } from '../app/data/source'
import type { DataSource, RecordData } from '../app/data/source'

const env = process.env
const available = Boolean(
  env.HRFLOW_REQUEST_BASE_URL &&
  env.HRFLOW_NOTIFICATION_BASE_URL &&
  env.HRFLOW_EMPLOYEE_TOKEN &&
  env.HRFLOW_FOREIGN_TOKEN,
)

// A fixture-only prefix adapter models routing to actual direct owner HTTP ports.
// This proves consumer/provider compatibility, not gateway, browser-cookie or identity acceptance.
function source(base: string, token?: string): DataSource {
  const root = new URL(base)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(root.hostname))
    throw new Error('Fixture must use loopback.')
  return new RemoteDataSource(`${root.origin}/api/v1`, () => token, (async (url, init) => {
    const target = new URL(String(url))
    target.pathname = target.pathname.replace(/^\/api\/v1/, '')
    return fetch(target, init)
  }) as typeof fetch)
}

describe.skipIf(!available)(
  'actual disposable request/notification providers (no gateway claim)',
  () => {
    it('web consumer handles employee workflow, pages, private evidence, retries and negative tenant/access cases', async () => {
      const employee = source(env.HRFLOW_REQUEST_BASE_URL!, env.HRFLOW_EMPLOYEE_TOKEN)
      const api = new WorkspaceApi(employee)
      const body: RecordData = {
        title: 'Synthetic web provider check',
        type: 'GENERAL',
        reason: 'Disposable integration evidence',
        quantity: 1,
      }
      const key = commandKey()
      const create = { method: 'POST' as const, path: '/requests', body, idempotencyKey: key }
      const first = await employee.send(create)
      const again = await employee.send(create)
      expect(again.data).toEqual(first.data)
      const id = String((first.data as RecordData).id)
      await expect(
        employee.send({ ...create, body: { ...body, title: 'Changed payload' } }),
      ).rejects.toMatchObject({ status: 409 })
      expect(
        (await api.list('myRequests', { page: 0, size: 25 })).items.some((row) => row.id === id),
      ).toBe(true)
      const detail = await api.detail('requests', id)
      expect(Boolean(detail.etag)).toBe(true)
      await api.update('requests', id, detail.row.version, {
        title: 'Reviewed web evidence',
        type: 'GENERAL',
        reason: 'Disposable integration evidence',
        quantity: 1,
      })
      await expect(
        employee.send({
          method: 'PATCH',
          path: `/requests/${id}`,
          ifMatch: detail.etag,
          body: { title: 'Stale edit' },
        }),
      ).rejects.toMatchObject({ status: 412 })
      const file = new File(['%PDF-1.4\nSynthetic fixture\n%%EOF'], 'synthetic-web.pdf', {
        type: 'application/pdf',
      })
      const uploaded = await new RemoteBusinessAdapter(employee).upload('request', id, file)
      expect(
        (await attachmentItems(employee, 'request', id)).some((item) => item.id === uploaded.id),
      ).toBe(true)
      expect(await privateAttachmentBytes(employee, 'request', id, uploaded.id)).toEqual(
        Array.from(new Uint8Array(await file.arrayBuffer())),
      )
      const materials = await api.materialOptions()
      const material = materials[0]
      if (!material) throw new Error('Fixture requires an active same-tenant material.')
      const draft = await api.create('requests', {
        title: 'Synthetic material',
        type: 'MATERIAL',
        reason: 'Disposable material evidence',
        quantity: 2,
        items: [{ materialId: material.id, quantity: 2 }],
      })
      const materialDetail = await api.detail('requests', draft.id)
      expect(materialDetail.row.items).toMatchObject([{ materialId: material.id, quantity: 2 }])
      await api.update('requests', draft.id, materialDetail.row.version, {
        type: 'MATERIAL',
        title: 'Updated synthetic material',
        reason: 'Disposable material evidence',
        quantity: 3,
        items: [{ materialId: material.id, quantity: 3 }],
      })
      expect((await api.detail('requests', draft.id)).row.items).toMatchObject([
        { materialId: material.id, quantity: 3 },
      ])
      for (const type of ['REMOTE_WORK', 'LATE_ARRIVAL', 'EARLY_LEAVE']) {
        const dates: RecordData = {
          startDate: '2026-11-02',
          endDate: '2026-11-02',
          ...(type === 'REMOTE_WORK' ? {} : { fromTime: '08:30', toTime: '09:00' }),
        }
        const typed = await api.create('requests', {
          title: `Synthetic ${type}`,
          type,
          reason: 'Disposable date evidence',
          quantity: 1,
          ...dates,
        })
        expect((await api.detail('requests', typed.id)).row).toMatchObject(dates)
      }
      const attendance = source(env.HRFLOW_ATTENDANCE_BASE_URL!, env.HRFLOW_EMPLOYEE_TOKEN)
      const attendanceApi = new WorkspaceApi(attendance)
      const correction = await attendanceApi.create('corrections', {
        date: '2026-10-28',
        proposedClockIn: '2026-10-28T01:00:00Z',
        proposedClockOut: '2026-10-28T10:00:00Z',
        reason: 'Synthetic correction evidence',
      })
      const ownCorrection = await attendanceApi.detail('corrections', correction.id)
      expect(Boolean(ownCorrection.etag)).toBe(true)
      await expect(
        attendanceApi.change('corrections', correction.id, 'approve', ownCorrection.row.version),
      ).rejects.toHaveProperty('status', 403)
      const reviewerSource = source(env.HRFLOW_ATTENDANCE_BASE_URL!, env.HRFLOW_MANAGER_TOKEN)
      const reviewer = new WorkspaceApi(reviewerSource)
      const reviewed = await reviewer.detail('corrections', correction.id)
      expect(
        (await reviewer.list('corrections', { page: 0, size: 25, status: 'PENDING' })).items.some(
          (row) => row.id === correction.id,
        ),
      ).toBe(true)
      await expect(
        reviewerSource.send({
          method: 'POST',
          path: `/attendance/corrections/${correction.id}/approve`,
          ifMatch: '"stale"',
          idempotencyKey: commandKey(),
        }),
      ).rejects.toHaveProperty('status', 412)
      await reviewer.change('corrections', correction.id, 'approve', reviewed.row.version)
      await expect(
        source(env.HRFLOW_ATTENDANCE_BASE_URL!, env.HRFLOW_FOREIGN_TOKEN).send({
          method: 'GET',
          path: `/attendance/corrections/${correction.id}`,
        }),
      ).rejects.toHaveProperty('status', 404)
      const foreign = source(env.HRFLOW_REQUEST_BASE_URL!, env.HRFLOW_FOREIGN_TOKEN)
      await expect(foreign.send({ method: 'GET', path: `/requests/${id}` })).rejects.toHaveProperty(
        'status',
        404,
      )
      await expect(
        foreign.send({
          method: 'GET',
          path: `/requests/${id}/attachments/${uploaded.id}/file`,
          responseType: 'bytes',
        }),
      ).rejects.toHaveProperty('status', 404)
      await expect(
        source(env.HRFLOW_REQUEST_BASE_URL!).send({ method: 'GET', path: `/requests/${id}` }),
      ).rejects.toHaveProperty('status', 401)
      const current = await api.detail('requests', id)
      await api.change('requests', id, 'submit', current.row.version)
      for (const role of ['MANAGER', 'HR']) {
        const token = env[`HRFLOW_${role}_TOKEN`]
        if (!token) throw new Error(`Fixture lacks ${role} token; role coverage is incomplete.`)
        await new WorkspaceApi(source(env.HRFLOW_REQUEST_BASE_URL!, token)).list(
          'pendingRequests',
          { page: 0, size: 25 },
        )
      }
      const owner = new WorkspaceApi(source(env.HRFLOW_REQUEST_BASE_URL!, env.HRFLOW_OWNER_TOKEN))
      await expect(owner.list('pendingRequests', { page: 0, size: 25 })).rejects.toHaveProperty(
        'status',
        403,
      )
      await expect(api.list('pendingRequests', { page: 0, size: 25 })).rejects.toHaveProperty(
        'status',
        403,
      )
    })
    it('web settings preserve provider fields and reviewed ETag, rejecting stale writes', async () => {
      const employee = source(env.HRFLOW_NOTIFICATION_BASE_URL!, env.HRFLOW_EMPLOYEE_TOKEN)
      const api = new WorkspaceApi(employee)
      await api.notices()
      const settings = await api.preferences()
      const changed = {
        email: !settings.data.email,
        inApp: settings.data.inApp,
        reminders: settings.data.reminders,
      }
      await api.savePreferences(changed, settings.etag)
      await expect(api.savePreferences(changed, settings.etag)).rejects.toHaveProperty(
        'status',
        412,
      )
      await expect(
        source(env.HRFLOW_NOTIFICATION_BASE_URL!).send({ method: 'GET', path: '/notifications' }),
      ).rejects.toHaveProperty('status', 401)
    })
  },
)
