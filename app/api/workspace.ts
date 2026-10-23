import { safeDownloadUrl } from '../utils/format'
import type { Resource } from '../types/workspace'
import { z } from 'zod'
import type { DataRequest, DataSource, RecordData } from '../data/source.ts'
import { commandKey, DataFailure } from '../data/source.ts'
import {
  Attendance,
  Balance,
  collection,
  decode,
  Entity,
  ExportJob,
  Notice,
  Preferences,
  Profile,
  Report,
} from '../schemas/contracts.ts'

export class WorkspaceApi {
  private readonly source: DataSource
  get mode() {
    return this.source.mode
  }
  private attempts = new Map<string, string>()
  private clockAttempt?: { sessionId?: string; body: RecordData; etag?: string }
  private guard: () => void
  constructor(
    source: DataSource,
    mutationGuard: () => void = () => {},
    private demoExport?: () => Promise<string>,
  ) {
    this.source = source
    this.guard = mutationGuard
  }
  private path(resource: Resource) {
    const paths: Record<Resource, string> = {
      leaves: '/leave/requests',
      myLeaves: '/leave/requests/me',
      pendingLeaves: '/leave/requests/pending',
      requests: '/requests',
      myRequests: '/requests/me',
      pendingRequests: this.source.mode === 'local' ? '/requests/pending' : '/requests/inbox',
      corrections: '/attendance/corrections',
      employees: '/employees',
      departments: '/departments',
      positions: '/positions',
      shifts: '/shifts',
      holidays: '/holidays',
      workSites: '/work-sites',
      materials: '/materials',
    }
    return paths[resource]
  }
  async list(resource: Resource) {
    const path = this.path(resource)
    const r = await this.source.send({ method: 'GET', path })
    return decode(collection(Entity), r.data)
  }
  async detail(resource: Resource, id: string) {
    const path = `${this.path(resource)}/${encodeURIComponent(id)}`
    const r = await this.source.send({ method: 'GET', path })
    return { row: decode(Entity, r.data), etag: r.etag }
  }
  async profile() {
    return decode(Profile, (await this.source.send({ method: 'GET', path: '/auth/me' })).data)
  }
  async attendance() {
    return decode(
      collection(Attendance),
      (await this.source.send({ method: 'GET', path: '/attendance/me' })).data,
    )
  }
  async today() {
    return decode(
      z.object({ date: z.string(), sessions: z.array(Attendance) }),
      (await this.source.send({ method: 'GET', path: '/attendance/today' })).data,
    )
  }
  async balances() {
    return decode(
      collection(Balance),
      (await this.source.send({ method: 'GET', path: '/leave/balances/me' })).data,
    )
  }
  async notices() {
    return decode(
      collection(Notice),
      (await this.source.send({ method: 'GET', path: '/notifications' })).data,
    )
  }
  async preferences() {
    const r = await this.source.send({ method: 'GET', path: '/notifications/preferences' })
    return { data: decode(Preferences, r.data), etag: r.etag }
  }
  async report() {
    return decode(
      Report,
      (await this.source.send({ method: 'GET', path: '/reports/dashboard' })).data,
    )
  }
  private async command(
    path: string,
    body?: RecordData,
    ifMatch?: string,
    method: DataRequest['method'] = 'POST',
  ) {
    this.guard()
    const signature = JSON.stringify([method, path, body, ifMatch])
    const key = this.attempts.get(signature) ?? commandKey()
    this.attempts.set(signature, key)
    try {
      const r = await this.source.send({ method, path, body, ifMatch, idempotencyKey: key })
      this.attempts.delete(signature)
      return r
    } catch (e) {
      if (e instanceof DataFailure && e.status >= 400 && e.status < 500)
        this.attempts.delete(signature)
      throw e
    }
  }
  async create(resource: Resource, body: RecordData) {
    return decode(Entity, (await this.command(this.path(resource), body)).data)
  }
  async change(
    resource: Resource,
    id: string,
    action: string,
    expectedVersion: number,
    body?: RecordData,
    method: DataRequest['method'] = 'POST',
  ) {
    const path = this.path(resource)
    const { row, etag } = await this.detail(resource, id)
    if (row.version !== expectedVersion)
      throw new DataFailure(
        412,
        'STALE_VERSION',
        'This record changed. Refresh and review it before deciding.',
      )
    if (!etag)
      throw new DataFailure(
        0,
        'CONTRACT_MISMATCH',
        'The server did not provide a version ETag. No change was sent.',
      )
    return this.command(
      `${path}/${encodeURIComponent(id)}${action ? `/${action}` : ''}`,
      body,
      etag,
      method,
    )
  }
  async exportReport(body: RecordData) {
    return decode(ExportJob, (await this.command('/reports/exports', body)).data)
  }
  async update(resource: Resource, id: string, version: number, body: RecordData) {
    return decode(Entity, (await this.change(resource, id, '', version, body, 'PATCH')).data)
  }
  async clock(open?: { id: string; version: number }) {
    this.guard()
    if (!this.clockAttempt || this.clockAttempt.sessionId !== open?.id) {
      let device: string | null = null
      try {
        device = localStorage.getItem('hrflow.installation-id')
      } catch {
        /* Storage may be disabled. The command still gets a session-local device reference. */
      }
      if (!device) {
        device = commandKey()
        try {
          localStorage.setItem('hrflow.installation-id', device)
        } catch {
          /* No credentials or command receipts are persisted. */
        }
      }
      this.clockAttempt = {
        sessionId: open?.id,
        body: {
          deviceId: device,
          occurredAt: new Date().toISOString(),
          ...(open ? { sessionId: open.id } : { source: 'TAP' }),
        },
        etag: open ? `"${open.version}"` : undefined,
      }
    }
    const attempt = this.clockAttempt
    try {
      const result = await this.command(
        open ? '/attendance/check-out' : '/attendance/check-in',
        attempt.body,
        attempt.etag,
      )
      this.clockAttempt = undefined
      return result
    } catch (e) {
      if (e instanceof DataFailure && e.status >= 400 && e.status < 500)
        this.clockAttempt = undefined
      throw e
    }
  }
  async readNotice(id?: string) {
    return this.command(
      id ? `/notifications/${encodeURIComponent(id)}/read` : '/notifications/read-all',
    )
  }
  async savePreferences(body: RecordData, etag?: string) {
    if (!etag)
      throw new DataFailure(428, 'VERSION_REQUIRED', 'Refresh your settings before saving.')
    return decode(
      Preferences,
      (await this.command('/notifications/preferences', body, etag, 'PUT')).data,
    )
  }
  async downloadLeaveReport(apiBase: string, origin: string) {
    const job = await this.exportReport({ type: 'LEAVE', format: 'CSV' })
    if (job.status !== 'COMPLETED') return job
    if (this.demoExport) {
      const blob = new Blob([await this.demoExport()], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hrflow-demo-leave.csv'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } else if (job.downloadUrl)
      window.location.assign(safeDownloadUrl(job.downloadUrl, apiBase, origin))
    else
      throw new Error('The export completed without a download link. Contact your administrator.')
    return job
  }
  clear() {
    this.attempts.clear()
    this.clockAttempt = undefined
  }
}
