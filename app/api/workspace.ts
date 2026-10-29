import { AttendanceClock } from './attendance-clock'
import type { ClockSession, ClockLocation } from './attendance-clock'
import type { Resource } from '../types/workspace'
import { z } from 'zod'
import type { DataRequest, DataSource, RecordData } from '../data/source.ts'
import { commandKey, DataFailure } from '../data/source.ts'
import { fetchAuditLogs } from '../features/audit/data/audit.ts'
import type { AuditOptions } from '../features/audit/data/audit.ts'
import { resourcePath } from './resource-paths.ts'
import { attendanceReport, downloadReportCsv } from '../features/reporting/data'
import { allPages } from './collections'
import {
  attachmentItems,
  privateAttachmentBytes,
} from '../features/requests/data/attachment-records'
import { requestRecord } from '../features/requests/data/record'
import { materialOptions } from '../features/requests/data/material-options'
import { LeaveApi } from '../features/leave/data/leave-api'
import {
  Attendance,
  Balance,
  collection,
  pagedCollection,
  decode,
  Entity,
  ExportJob,
  ApprovalDelegation,
  EligibleDelegate,
  Notice,
  Preferences,
  Profile,
  Report,
} from '../schemas/contracts.ts'

export class WorkspaceApi {
  readonly leave: LeaveApi
  private readonly source: DataSource
  get mode() {
    return this.source.mode
  }
  private attempts = new Map<string, string>()
  private attendanceClock: AttendanceClock
  private guard: () => void
  constructor(
    source: DataSource,
    mutationGuard: () => void = () => {},
    private demoExport?: () => Promise<string>,
    private wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ) {
    this.source = source
    this.guard = mutationGuard
    this.attendanceClock = new AttendanceClock(
      (path, body, etag) => this.command(path, body, etag),
      mutationGuard,
    )
    this.leave = new LeaveApi(source, (path, body) => this.command(path, body))
  }
  private path(resource: Resource) {
    return resourcePath(this.source.mode, resource)
  }
  async list(
    resource: Resource,
    options?: {
      page?: number
      size?: number
      search?: string
      status?: string
      sort?: 'oldest' | 'newest'
      minAgeDays?: number
    },
  ) {
    if (
      (options?.page !== undefined && (!Number.isInteger(options.page) || options.page < 0)) ||
      (options?.size !== undefined &&
        (!Number.isInteger(options.size) || options.size < 1 || options.size > 100))
    )
      throw new DataFailure(400, 'INVALID_PAGINATION', 'Use page 0 or higher and size 1–100.')
    const path = this.path(resource)
    if (
      this.mode === 'remote' &&
      ['leaves', 'myLeaves', 'pendingLeaves', 'myRequests', 'pendingRequests'].includes(resource)
    )
      options = { page: 0, size: 25, ...options }
    const query = options
      ? {
          ...(options.page !== undefined ? { page: String(options.page) } : {}),
          ...(options.size !== undefined ? { size: String(options.size) } : {}),
          ...(options.search?.trim() ? { search: options.search.trim() } : {}),
          ...(options.status ? { status: options.status } : {}),
          ...(options.sort ? { sort: options.sort } : {}),
          ...(options.minAgeDays ? { minAgeDays: String(options.minAgeDays) } : {}),
        }
      : undefined
    const r = await this.source.send({ method: 'GET', path, query })
    return decode(
      ['employees', 'pendingLeaves', 'pendingRequests', 'corrections'].includes(resource)
        ? pagedCollection(Entity)
        : collection(Entity),
      r.data,
    )
  }
  async detail(resource: Resource, id: string) {
    const path = `${this.path(resource)}/${encodeURIComponent(id)}`
    const r = await this.source.send({ method: 'GET', path })
    return {
      row: resource === 'requests' ? requestRecord(r.data) : decode(Entity, r.data),
      etag: r.etag,
    }
  }
  attachmentItems(scope: 'request' | 'leave', id: string) {
    return attachmentItems(this.source, scope, id)
  }
  attachmentBytes(scope: 'request' | 'leave', id: string, attachmentId: string) {
    return privateAttachmentBytes(this.source, scope, id, attachmentId)
  }
  materialOptions() {
    return materialOptions(this.source)
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
  async balances(year?: number, employeeId?: string) {
    if (this.mode === 'remote') return this.leave.balances(year, employeeId)
    return decode(
      collection(Balance),
      (
        await this.source.send({
          method: 'GET',
          path: '/leave/balances/me',
          query: {
            ...(year ? { year: String(year) } : {}),
            ...(employeeId ? { employeeId } : {}),
          },
        })
      ).data,
    )
  }
  async notices() {
    if (this.mode === 'remote') {
      const items = await allPages(this.source, '/notifications', Notice)
      return { items, total: items.length }
    }
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
  attendanceReport(from?: string, to?: string) {
    return attendanceReport(this.source, from, to)
  }
  async auditLogs(options: AuditOptions) {
    return fetchAuditLogs(this.source, options)
  }
  async delegations() {
    const response = await this.source.send({ method: 'GET', path: '/approvals/delegations' })
    return decode(collection(ApprovalDelegation), response.data)
  }
  async eligibleDelegates(search = '') {
    const response = await this.source.send({
      method: 'GET',
      path: '/approvals/eligible-delegates',
      query: { ...(search.trim() ? { search: search.trim() } : {}), page: '0', size: '25' },
    })
    return decode(collection(EligibleDelegate), response.data)
  }
  async createDelegation(body: RecordData) {
    return decode(ApprovalDelegation, (await this.command('/approvals/delegations', body)).data)
  }
  async cancelDelegation(id: string, version: number) {
    return decode(
      ApprovalDelegation,
      (
        await this.command(
          `/approvals/delegations/${encodeURIComponent(id)}`,
          undefined,
          `"${version}"`,
          'DELETE',
        )
      ).data,
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
    return decode(
      Entity,
      (await this.command(this.path(resource), this.commandBody(resource, body))).data,
    )
  }
  private commandBody(resource: Resource, body: RecordData) {
    return this.mode === 'remote' && resource === 'requests' && body.type !== 'MATERIAL'
      ? { ...body, quantity: body.quantity ?? 1 }
      : body
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
  async exportStatus(id: string) {
    return decode(
      ExportJob,
      (
        await this.source.send({
          method: 'GET',
          path: `/reports/exports/${encodeURIComponent(id)}`,
        })
      ).data,
    )
  }
  async update(resource: Resource, id: string, version: number, body: RecordData) {
    return decode(
      Entity,
      (await this.change(resource, id, '', version, this.commandBody(resource, body), 'PATCH'))
        .data,
    )
  }
  clock(open?: ClockSession, location?: ClockLocation) {
    return this.attendanceClock.clock(open, location)
  }
  async adjustBalance(body: RecordData) {
    return this.command('/leave/balance-adjustments', body)
  }
  async issueMaterial(body: RecordData) {
    const request = await this.detail('requests', String(body.recordId))
    if (body.expectedVersion !== undefined && request.row.version !== body.expectedVersion)
      throw new DataFailure(
        412,
        'STALE_VERSION',
        'Refresh and review the changed request before issuing materials.',
      )
    return this.command(`/requests/${request.row.id}/fulfill`, body, request.etag)
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
  async downloadLeaveReport(apiBase: string, origin: string, allowedOrigins: string[] = []) {
    return downloadReportCsv(this, this.source, 'LEAVE', this.wait, this.demoExport)
  }
  downloadAttendanceReport() {
    return downloadReportCsv(this, this.source, 'ATTENDANCE', this.wait)
  }
  clear() {
    this.attempts.clear()
    this.attendanceClock.clear()
  }
}
