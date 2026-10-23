import fixture from './demo-seed.json' with { type: 'json' }
import { DataFailure, validateRequest } from './source.ts'
import type { DataRequest, DataResponse, DataSource, RecordData } from './source.ts'

type Role = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'OWNER'
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  )

/** In-memory synthetic demo service. Never used as a fallback for the API. */
export class LocalDataSource implements DataSource {
  readonly mode = 'local' as const
  private state = clone(fixture)
  private rows = new Map<string, RecordData[]>()
  private receipts = new Map<string, { fingerprint: string; response: DataResponse }>()
  private sessions: RecordData[] = []
  private notifications: RecordData[] = []
  private actor: Role = 'EMPLOYEE'
  private sequence = 0
  private readonly now: () => Date
  constructor(now = () => new Date()) {
    this.now = now
    this.reset()
  }
  /** Demo-only role switch; remote authorization always belongs to the server. */
  setDemoRole(role: Role) {
    this.actor = role
  }
  reset() {
    this.state = clone(fixture)
    this.rows = new Map(
      this.state.resources.map((resource) => [resource.path, clone(resource.records)]),
    )
    this.receipts.clear()
    this.sessions = []
    this.notifications = []
    this.sequence = 0
    this.actor = 'EMPLOYEE'
  }
  async send(request: DataRequest): Promise<DataResponse> {
    validateRequest(request)
    if (Object.keys(request.query ?? {}).length)
      throw new DataFailure(
        501,
        'DEMO_NOT_IMPLEMENTED',
        'Local query filters are not implemented yet.',
      )
    const scope = `${this.actor}:${request.method}:${request.path}:${request.idempotencyKey}`
    const fingerprint = canonical({
      body: request.body ?? null,
      query: request.query ?? {},
      ifMatch: request.ifMatch ?? null,
    })
    const previous = request.method === 'POST' ? this.receipts.get(scope) : undefined
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new DataFailure(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This key was already used for a different command.',
        )
      return clone(previous.response)
    }
    const response = this.dispatch(request)
    if (request.method === 'POST')
      this.receipts.set(scope, { fingerprint, response: clone(response) })
    return clone(response)
  }
  private dispatch(r: DataRequest): DataResponse {
    const ok = (data: DataResponse['data'], status = 200, etag?: string): DataResponse => ({
      status,
      data,
      etag,
    })
    if (r.method === 'GET' && r.path === '/auth/me')
      return ok({ ...this.state.profile, roles: [this.actor] })
    if (r.method === 'GET' && r.path === '/employees') {
      if (this.actor === 'EMPLOYEE')
        throw new DataFailure(403, 'FORBIDDEN', 'Management access is required.')
      return ok({ items: this.state.employees, total: this.state.employees.length })
    }
    if (r.method === 'GET' && r.path === '/notifications')
      return ok({ items: this.notifications, total: this.notifications.length })
    if (r.method === 'GET' && r.path === '/attendance/today') {
      const today = new Date(this.now().getTime() + this.state.timezoneOffsetMinutes * 60000)
        .toISOString()
        .slice(0, 10)
      return ok({
        date: today,
        sessions: this.sessions.filter((row) =>
          new Date(
            new Date(String(row.clockIn)).getTime() + this.state.timezoneOffsetMinutes * 60000,
          )
            .toISOString()
            .startsWith(today),
        ),
      })
    }
    if (r.method === 'GET' && r.path === '/attendance/me')
      return ok({ items: this.sessions, total: this.sessions.length })
    if (r.method === 'POST' && ['/attendance/check-in', '/attendance/check-out'].includes(r.path)) {
      const open = this.sessions.find((row) => row.clockOut === null)
      if (r.path.endsWith('check-in')) {
        if (open)
          throw new DataFailure(
            409,
            'SESSION_ALREADY_OPEN',
            'Clock out before starting another session.',
          )
        const row: RecordData = {
          id: `demo-${++this.sequence}`,
          clockIn: this.now().toISOString(),
          clockOut: null,
          version: 1,
        }
        this.sessions.push(row)
        return ok(row, 201, '"1"')
      }
      if (!open) throw new DataFailure(409, 'NO_OPEN_SESSION', 'Clock in before clocking out.')
      this.checkVersion(r, open)
      open.clockOut = this.now().toISOString()
      open.version = Number(open.version) + 1
      return ok(open, 200, `"${open.version}"`)
    }
    for (const resource of this.state.resources) {
      const rows = this.rows.get(resource.path)!
      if (r.method === 'GET' && [resource.listPath, `${resource.path}/pending`].includes(r.path)) {
        if (r.path.endsWith('/pending') && this.actor === 'EMPLOYEE')
          throw new DataFailure(403, 'FORBIDDEN', 'Management access is required.')
        const items = r.path.endsWith('/pending')
          ? rows.filter((row) => row.status === 'PENDING')
          : rows
        return ok({ items, total: items.length })
      }
      if (r.method === 'POST' && r.path === resource.path) {
        if (!r.body || Object.keys(r.body).length === 0)
          throw new DataFailure(422, 'VALIDATION_ERROR', 'Provide request details.')
        const row = {
          ...clone(r.body),
          id: `demo-${++this.sequence}`,
          employeeId: 'demo-employee',
          status: resource.initialStatus,
          version: 1,
          history: [{ status: resource.initialStatus, at: this.now().toISOString() }],
        }
        rows.push(row)
        return ok(row, 201, '"1"')
      }
      if (!r.path.startsWith(resource.path + '/')) continue
      const [id, action, ...rest] = r.path.slice(resource.path.length + 1).split('/')
      if (rest.length) continue
      const row = rows.find((row) => row.id === id)
      if (!row) throw new DataFailure(404, 'NOT_FOUND', 'Record not found.')
      if (r.method === 'GET' && !action) return ok(row, 200, `"${row.version}"`)
      if (r.method === 'PATCH' && !action && resource.path === '/requests') {
        this.checkVersion(r, row)
        if (row.status !== 'DRAFT')
          throw new DataFailure(409, 'DRAFT_REQUIRED', 'Only a draft can be edited.')
        Object.assign(row, clone(r.body ?? {}), {
          id: row.id,
          employeeId: row.employeeId,
          status: 'DRAFT',
          version: Number(row.version) + 1,
        })
        return ok(row, 200, `"${row.version}"`)
      }
      const transition =
        action && Object.hasOwn(resource.transitions, action)
          ? (resource.transitions[action as keyof typeof resource.transitions] as {
              from: string[]
              to: string
              roles: string[]
            })
          : undefined
      if (r.method !== 'POST' || !transition) continue
      if (!transition.roles.includes(this.actor))
        throw new DataFailure(403, 'FORBIDDEN', 'This demo role cannot perform this action.')
      this.checkVersion(r, row)
      const eligibleFutureCancellation =
        resource.path === '/leave/requests' &&
        action === 'cancel' &&
        row.status === 'APPROVED' &&
        String(row.startDate) >
          new Date(this.now().getTime() + this.state.timezoneOffsetMinutes * 60000)
            .toISOString()
            .slice(0, 10)
      if (!transition.from.includes(String(row.status)) && !eligibleFutureCancellation)
        throw new DataFailure(
          409,
          'INVALID_TRANSITION',
          'This action is unavailable in the current state.',
        )
      if (action === 'fulfill' && r.body?.quantity !== undefined) {
        const quantity = Number(r.body.quantity)
        const total = Number(row.quantity ?? 1)
        const filled = Number(row.fulfilledQuantity ?? 0)
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > total - filled)
          throw new DataFailure(
            422,
            'INVALID_QUANTITY',
            'Issue no more than the remaining quantity.',
          )
        row.fulfilledQuantity = filled + quantity
        row.status = filled + quantity === total ? 'FULFILLED' : 'APPROVED'
      } else row.status = transition.to
      if (r.body?.reason) row.decisionReason = r.body.reason
      const history = Array.isArray(row.history) ? row.history : []
      history.push({
        status: String(row.status),
        at: this.now().toISOString(),
        reason: String(r.body?.reason ?? ''),
      })
      row.history = history
      row.version = Number(row.version) + 1
      this.notifications.push({
        id: `demo-${++this.sequence}`,
        title: `Request ${transition.to.toLowerCase()}`,
        read: false,
      })
      return ok(row, 200, `"${row.version}"`)
    }
    throw new DataFailure(
      501,
      'DEMO_NOT_IMPLEMENTED',
      'This operation has no local simulation yet.',
    )
  }
  private checkVersion(request: DataRequest, row: RecordData) {
    if (!request.ifMatch)
      throw new DataFailure(428, 'VERSION_REQUIRED', 'Read the record and supply its ETag.')
    if (request.ifMatch !== `"${row.version}"`)
      throw new DataFailure(412, 'STALE_VERSION', 'This record changed. Refresh before deciding.')
  }
}
