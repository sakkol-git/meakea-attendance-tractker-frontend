import { LocalDataSource } from '../data/local.ts'
import { DataFailure, validateRequest, commandKey } from '../data/source.ts'
import type { DataRequest, DataResponse, DataSource, RecordData } from '../data/source.ts'
import { correctionForm, employeeForm, leaveForm, requestForm } from '../schemas/forms.ts'
import { toCsv } from '../utils/format.ts'
import { DemoDelegations } from '../features/approvals/data/demo-delegation.ts'
import { pageRows } from './page.ts'
import {
  withPolicyExceptions,
  withReviewContext,
} from '../features/approvals/data/demo-review-context.ts'

const clone = <T>(value: T): T => structuredClone(value)
const isoDay = (offset: number) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}
export function workingDays(start: string, end: string, holidays: string[] = []) {
  let days = 0
  const cursor = new Date(`${start}T12:00:00Z`)
  const finish = new Date(`${end}T12:00:00Z`)
  if (
    !Number.isFinite(+cursor) ||
    !Number.isFinite(+finish) ||
    finish < cursor ||
    (+finish - +cursor) / 86400000 > 366
  )
    throw new DataFailure(422, 'INVALID_DATES', 'Choose a valid period of no more than one year.')
  while (cursor <= finish) {
    if (
      ![0, 6].includes(cursor.getUTCDay()) &&
      !holidays.includes(cursor.toISOString().slice(0, 10))
    )
      days++
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

/** Explicit UI simulation layered over the existing shared data source, never a remote fallback. */
export class WorkspaceDemoSource implements DataSource {
  readonly mode = 'local' as const
  private base: LocalDataSource
  private ready?: Promise<void>
  private role = 'EMPLOYEE'
  private rows = new Map<string, RecordData[]>()
  private receipts = new Map<string, { signature: string; result: DataResponse }>()
  private read = new Set<string>()
  private sequence = 1000
  private adjustments: RecordData[] = []
  private approvals = new DemoDelegations()
  private deliveryQueue: Promise<void> = Promise.resolve()
  private preferences = { email: true, inApp: true, reminders: true, version: 1 }
  private history = Array.from({ length: 8 }, (_, i) => ({
    id: `history-${i}`,
    clockIn: `${isoDay(-i - 1)}T02:00:00.000Z`,
    clockOut: `${isoDay(-i - 1)}T10:00:00.000Z`,
    version: 1,
  }))
  constructor(base: LocalDataSource) {
    this.base = base
  }
  setRole(role: string) {
    this.role = role
    this.approvals.setRole(role)
    this.base.setDemoRole(role as 'EMPLOYEE')
  }
  reset() {
    this.base.reset()
    this.ready = undefined
    this.read.clear()
    this.receipts.clear()
    this.rows.clear()
    this.adjustments = []
    this.approvals.reset()
    this.role = 'EMPLOYEE'
    this.approvals.setRole('EMPLOYEE')
    this.preferences = { email: true, inApp: true, reminders: true, version: 1 }
  }
  private async seed() {
    const original = (await this.base.send({ method: 'GET', path: '/auth/me' })).data as RecordData
    this.rows.set('/employees', [
      {
        id: String(original.employeeId),
        name: String(original.name),
        email: 'dara@example.test',
        department: 'Engineering',
        position: 'Software engineer',
        status: 'ACTIVE',
        version: 1,
      },
      {
        id: 'demo-manager',
        name: 'Chan Sopheak',
        email: 'sopheak@example.test',
        department: 'Engineering',
        position: 'Engineering manager',
        status: 'ACTIVE',
        version: 1,
      },
    ])
    const master: Record<string, RecordData[]> = {
      '/departments': [
        {
          id: 'engineering',
          name: 'Engineering',
          description: 'Build thoughtful products',
          version: 1,
        },
        {
          id: 'operations',
          name: 'Operations',
          description: 'Keep the workplace running',
          version: 1,
        },
      ],
      '/positions': [
        { id: 'engineer', name: 'Software engineer', department: 'Engineering', version: 1 },
        { id: 'manager', name: 'Engineering manager', department: 'Engineering', version: 1 },
      ],
      '/shifts': [
        {
          id: 'standard',
          name: 'Standard workday',
          start: '09:00',
          end: '17:00',
          description: 'Monday–Friday · Demo policy',
          version: 1,
        },
      ],
      '/holidays': [
        {
          id: 'water-festival',
          name: 'Water Festival',
          date: isoDay(12),
          description: 'Illustrative company calendar',
          version: 1,
        },
        { id: 'company-day', name: 'Company day', date: isoDay(25), version: 1 },
      ],
      '/work-sites': [
        { id: 'office', name: 'Phnom Penh office', description: 'Main workspace', version: 1 },
      ],
      '/materials': [
        {
          id: 'monitor',
          name: 'External monitor',
          description: 'Workspace equipment',
          quantity: 8,
          version: 1,
        },
        { id: 'keyboard', name: 'Keyboard', quantity: 12, version: 1 },
      ],
    }
    for (const [path, rows] of Object.entries(master)) this.rows.set(path, rows)
    for (const [type, offset, count] of [
      ['Annual leave', 5, 2],
      ['Personal leave', 12, 1],
      ['Annual leave', -12, 3],
    ] as const) {
      const created = await this.base.send({
        method: 'POST',
        path: '/leave/requests',
        body: {
          type,
          startDate: isoDay(offset),
          endDate: isoDay(offset + count - 1),
          days: count,
          reason: offset > 0 ? 'Time with family and a little rest.' : 'A planned personal break.',
          employeeName: String(original.name),
          createdAt: new Date().toISOString(),
        },
        idempotencyKey: commandKey(),
      })
      if (offset < 0) {
        this.base.setDemoRole('MANAGER')
        await this.base.send({
          method: 'POST',
          path: `/leave/requests/${(created.data as RecordData).id}/approve`,
          ifMatch: created.etag,
          idempotencyKey: commandKey(),
        })
        this.base.setDemoRole('EMPLOYEE')
      }
    }
    for (const [title, type, submit] of [
      ['A monitor for my desk', 'Equipment', true],
      ['Work from home on Friday', 'Remote work', true],
      ['Conference registration', 'General', false],
    ] as const) {
      const created = await this.base.send({
        method: 'POST',
        path: '/requests',
        body: {
          title,
          type,
          quantity: 1,
          reason: 'Please review this workplace request.',
          employeeName: String(original.name),
          createdAt: new Date().toISOString(),
        },
        idempotencyKey: commandKey(),
      })
      if (submit)
        await this.base.send({
          method: 'POST',
          path: `/requests/${(created.data as RecordData).id}/submit`,
          ifMatch: created.etag,
          idempotencyKey: commandKey(),
        })
    }
    this.base.setDemoRole(this.role as 'EMPLOYEE')
  }
  private requireManager() {
    if (this.role === 'EMPLOYEE')
      throw new DataFailure(403, 'FORBIDDEN', 'Management access is required.')
  }
  private requireAdmin() {
    if (!['HR_ADMIN', 'OWNER'].includes(this.role))
      throw new DataFailure(403, 'FORBIDDEN', 'HR administrator access is required.')
  }
  private version(request: DataRequest, row: RecordData) {
    if (!request.ifMatch)
      throw new DataFailure(428, 'VERSION_REQUIRED', 'Refresh this record before changing it.')
    if (request.ifMatch !== `"${row.version}"`)
      throw new DataFailure(
        412,
        'STALE_VERSION',
        'Someone changed this record. Refresh before trying again.',
      )
  }
  async send(request: DataRequest): Promise<DataResponse> {
    if (request.method === 'GET') return this.deliver(request)
    const next = this.deliveryQueue.then(() => this.deliver(request))
    this.deliveryQueue = next.then(
      () => {},
      () => {},
    )
    return next
  }
  private async deliver(request: DataRequest): Promise<DataResponse> {
    this.ready ??= this.seed()
    await this.ready
    validateRequest(request)
    const receipt = `${this.role}:${request.method}:${request.path}:${request.idempotencyKey}`
    const signature = JSON.stringify([request.body, request.ifMatch, request.query])
    const saved = request.method === 'POST' ? this.receipts.get(receipt) : undefined
    if (saved) {
      if (saved.signature !== signature)
        throw new DataFailure(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This key belongs to a different operation.',
        )
      return clone(saved.result)
    }
    const result = await this.dispatch(request)
    if (request.method === 'POST') this.receipts.set(receipt, { signature, result: clone(result) })
    return clone(result)
  }
  private async dispatch(r: DataRequest): Promise<DataResponse> {
    const ok = (data: unknown, status = 200, version?: number): DataResponse => ({
      status,
      data: data as DataResponse['data'],
      etag: version ? `"${version}"` : undefined,
    })
    if (r.path === '/auth/me' && r.method === 'GET')
      return ok({
        ...((await this.base.send(r)).data as object),
        roles: [this.role],
        email: 'dara@example.test',
        department: 'Engineering',
        position: 'Software engineer',
        timeZone: 'Asia/Phnom_Penh',
      })
    const approvalResponse = this.approvals.handle(r)
    if (approvalResponse) return approvalResponse
    if (
      r.method === 'GET' &&
      this.role !== 'EMPLOYEE' &&
      (/^\/leave\/requests\/[^/]+$/.test(r.path) || /^\/requests\/[^/]+$/.test(r.path))
    ) {
      const response = await this.base.send(r)
      return withReviewContext(r.path, response, this.rows.get('/materials')?.[0])
    }
    if (
      r.method === 'GET' &&
      this.role !== 'EMPLOYEE' &&
      ['/leave/requests/pending', '/requests/pending', '/attendance/corrections'].includes(r.path)
    ) {
      const response = await this.base.send(r)
      return withPolicyExceptions(r.path, response)
    }
    if (r.path === '/attendance/me' && r.method === 'GET') {
      const response = (await this.base.send(r)).data as { items: RecordData[] }
      return ok({
        items: [...response.items, ...this.history],
        total: response.items.length + this.history.length,
      })
    }
    if (r.path === '/leave/balances/me' && r.method === 'GET') {
      const items = (
        (await this.base.send({ method: 'GET', path: '/leave/requests/me' })).data as {
          items: RecordData[]
        }
      ).items
      const year = Number(r.query?.year ?? new Date().getFullYear())
      const employeeId = r.query?.employeeId ?? 'demo-employee'
      if (employeeId !== 'demo-employee') this.requireAdmin()
      const ownedItems = items.filter(
        (x) => x.employeeId === employeeId && String(x.startDate).startsWith(String(year)),
      )
      return ok({
        items: [
          ['Annual leave', 15],
          ['Sick leave', 10],
          ['Personal leave', 5],
        ].map(([type, entitlement]) => ({
          type,
          available:
            Number(entitlement) +
            this.adjustments
              .filter((x) => x.employeeId === employeeId && x.year === year && x.type === type)
              .reduce((sum, x) => sum + Number(x.days), 0) -
            ownedItems
              .filter((x) => x.type === type && ['PENDING', 'APPROVED'].includes(String(x.status)))
              .reduce((s, x) => s + Number(x.days || 0), 0),
          pending: ownedItems
            .filter((x) => x.type === type && x.status === 'PENDING')
            .reduce((s, x) => s + Number(x.days || 0), 0),
          unit: 'days',
          year,
        })),
        total: 3,
      })
    }
    if (r.path === '/leave/balance-adjustments' && r.method === 'POST') {
      this.requireAdmin()
      const body = r.body ?? {}
      const amount = Number(body.days)
      if (
        !this.rows.get('/employees')!.some((x) => x.id === body.employeeId) ||
        !['Annual leave', 'Sick leave', 'Personal leave'].includes(String(body.type)) ||
        !Number.isInteger(body.year) ||
        !Number.isFinite(amount) ||
        amount === 0 ||
        !Number.isInteger(amount * 2) ||
        String(body.reason ?? '').trim().length < 5
      )
        throw new DataFailure(
          422,
          'INVALID_ADJUSTMENT',
          'Choose an employee, year, exact half-day amount and reason.',
        )
      const current = (
        await this.dispatch({
          method: 'GET',
          path: '/leave/balances/me',
          query: { employeeId: String(body.employeeId), year: String(body.year) },
        })
      ).data as { items: { type: string; available: number }[] }
      if ((current.items.find((x) => x.type === body.type)?.available ?? 0) + amount < 0)
        throw new DataFailure(
          422,
          'NEGATIVE_BALANCE',
          'This adjustment would overdraw available leave.',
        )
      const row = { ...body, id: `adjustment-${++this.sequence}`, version: 1, status: 'POSTED' }
      this.adjustments.push(row)
      return ok(row, 201, 1)
    }
    if (r.method === 'POST' && /^\/requests\/[^/]+\/fulfill$/.test(r.path)) {
      this.requireAdmin()
      if (!r.body?.materialId)
        throw new DataFailure(
          422,
          'MATERIAL_REQUIRED',
          'Select the stock material before issuing equipment.',
        )
      const material = this.rows.get('/materials')!.find((x) => x.id === r.body!.materialId)
      const quantity = Number(r.body.quantity)
      const request = (
        await this.base.send({ method: 'GET', path: r.path.replace('/fulfill', '') })
      ).data as RecordData
      if (!/^(Equipment|MATERIAL)$/.test(String(request.type)) || request.status !== 'APPROVED')
        throw new DataFailure(
          409,
          'APPROVED_MATERIAL_REQUIRED',
          'Only approved equipment requests can be issued.',
        )
      if (
        !material ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > Number(material.quantity) ||
        quantity > Number(request.quantity ?? 1) - Number(request.fulfilledQuantity ?? 0)
      )
        throw new DataFailure(
          422,
          'INSUFFICIENT_STOCK',
          'Choose a valid material and no more than available stock or outstanding quantity.',
        )
      material.quantity = Number(material.quantity) - quantity
      material.version = Number(material.version) + 1
      try {
        return await this.base.send({
          ...r,
          body: {
            ...r.body,
            materialName: String(material.name ?? material.id),
            requestedQuantity: Number(request.quantity ?? 1),
            issuedBefore: Number(request.fulfilledQuantity ?? 0),
            remainingAfter:
              Number(request.quantity ?? 1) - Number(request.fulfilledQuantity ?? 0) - quantity,
            stockBefore: Number(material.quantity) + quantity,
            stockAfter: Number(material.quantity),
          },
        })
      } catch (e) {
        material.quantity = Number(material.quantity) + quantity
        material.version = Number(material.version) + 1
        throw e
      }
    }
    if (r.path === '/leave/requests' && r.method === 'POST') {
      const parsed = leaveForm.safeParse(r.body)
      if (!parsed.success)
        throw new DataFailure(422, 'VALIDATION_ERROR', parsed.error.issues[0]!.message)
      if (parsed.data.startDate.slice(0, 4) !== parsed.data.endDate.slice(0, 4))
        throw new DataFailure(
          422,
          'CROSS_YEAR_POLICY_REQUIRED',
          'Cross-year leave requires an approved settlement policy; use separately reviewed employee-year requests.',
        )
      const holidays = this.rows.get('/holidays')!.map((x) => String(x.date))
      const fullDays = workingDays(parsed.data.startDate, parsed.data.endDate, holidays)
      if (parsed.data.portion !== 'FULL_DAY' && parsed.data.startDate !== parsed.data.endDate)
        throw new DataFailure(
          422,
          'SINGLE_HALF_DAY',
          'A half-day request must use one working date.',
        )
      const days = parsed.data.portion === 'FULL_DAY' ? fullDays : fullDays ? 0.5 : 0
      if (!days)
        throw new DataFailure(
          422,
          'NO_WORKING_DAYS',
          'This demo calendar counts Monday–Friday only. Choose a working day.',
        )
      const balances = (
        await this.dispatch({
          method: 'GET',
          path: '/leave/balances/me',
          query: { year: parsed.data.startDate.slice(0, 4) },
        })
      ).data as { items: { type: string; available: number }[] }
      const balance = balances.items.find((x) => x.type === parsed.data.type)
      if (!balance || days > balance.available)
        throw new DataFailure(
          422,
          'LEAVE_BALANCE_INSUFFICIENT',
          'There is not enough available leave for this period.',
        )
      const all = (
        (await this.base.send({ method: 'GET', path: '/leave/requests/me' })).data as {
          items: RecordData[]
        }
      ).items
      if (
        all.some(
          (x) =>
            ['PENDING', 'APPROVED'].includes(String(x.status)) &&
            String(x.startDate) <= parsed.data.endDate &&
            String(x.endDate) >= parsed.data.startDate &&
            !(
              parsed.data.startDate === parsed.data.endDate &&
              x.startDate === x.endDate &&
              x.portion &&
              x.portion !== 'FULL_DAY' &&
              parsed.data.portion !== 'FULL_DAY' &&
              x.portion !== parsed.data.portion
            ),
        )
      )
        throw new DataFailure(409, 'LEAVE_OVERLAP', 'This period overlaps an existing request.')
      return this.base.send({
        ...r,
        body: {
          ...parsed.data,
          days,
          createdAt: new Date().toISOString(),
          employeeName: 'Sok Dara',
        },
      })
    }
    if (
      (r.path === '/requests' && r.method === 'POST') ||
      (/^\/requests\/[^/]+$/.test(r.path) && r.method === 'PATCH')
    ) {
      const p = requestForm.safeParse(r.body)
      if (!p.success) throw new DataFailure(422, 'VALIDATION_ERROR', p.error.issues[0]!.message)
      return this.base.send({
        ...r,
        body: { ...p.data, employeeName: 'Sok Dara', createdAt: new Date().toISOString() },
      })
    }
    if (r.path === '/attendance/corrections' && r.method === 'POST') {
      const p = correctionForm.safeParse(r.body)
      if (!p.success) throw new DataFailure(422, 'VALIDATION_ERROR', p.error.issues[0]!.message)
    }
    if (r.path === '/notifications/preferences') {
      if (r.method === 'GET') return ok(this.preferences, 200, this.preferences.version)
      if (r.method === 'PUT') {
        this.version(r, this.preferences)
        if (
          typeof r.body?.email !== 'boolean' ||
          typeof r.body?.inApp !== 'boolean' ||
          typeof r.body?.reminders !== 'boolean'
        )
          throw new DataFailure(422, 'VALIDATION_ERROR', 'Choose valid notification preferences.')
        if (!r.body.inApp && !r.body.email)
          throw new DataFailure(
            422,
            'CRITICAL_CHANNEL_REQUIRED',
            'Keep at least one channel enabled for approval updates.',
          )
        this.preferences = {
          email: r.body.email,
          inApp: r.body.inApp,
          reminders: r.body.reminders,
          version: this.preferences.version + 1,
        }
        return ok(this.preferences, 200, this.preferences.version)
      }
    }
    if (r.path === '/notifications' && r.method === 'GET') {
      const current = ((await this.base.send(r)).data as { items: RecordData[] }).items
      const notices: RecordData[] = [
        {
          id: 'welcome',
          title: 'A good day starts here',
          detail: 'Your workspace is ready. Explore your attendance and upcoming time off.',
          createdAt: new Date().toISOString(),
          to: '/',
          read: false,
        },
        ...current.map((x) => ({
          ...x,
          detail: 'Your request status has changed. Open your requests to see the latest update.',
          to: '/leave',
          createdAt: new Date().toISOString(),
          read: false,
        })),
      ]
      const items = notices.map((x) => ({ ...x, read: this.read.has(String(x.id)) }))
      return ok({ items, total: items.length })
    }
    if (r.method === 'POST' && r.path.startsWith('/notifications/')) {
      const all = (await this.dispatch({ method: 'GET', path: '/notifications' })).data as {
        items: RecordData[]
      }
      const id = r.path.split('/')[2]
      if (r.path.endsWith('/read-all')) for (const row of all.items) this.read.add(String(row.id))
      else if (r.path.endsWith('/read') && all.items.some((x) => x.id === id)) this.read.add(id!)
      else throw new DataFailure(404, 'NOT_FOUND', 'Notification not found.')
      return ok({ updated: true })
    }
    for (const [path, rows] of this.rows) {
      if (r.path !== path && !r.path.startsWith(path + '/')) continue
      if (path === '/employees') this.requireManager()
      else if (r.method !== 'GET') this.requireAdmin()
      if (r.method === 'GET' && r.path === path) {
        return ok(pageRows(rows, r.query))
      }
      if (r.method === 'POST' && r.path === path) {
        this.requireAdmin()
        if (path === '/employees') {
          const p = employeeForm.safeParse(r.body)
          if (!p.success) throw new DataFailure(422, 'VALIDATION_ERROR', p.error.issues[0]!.message)
        }
        if (!String(r.body?.name || '').trim())
          throw new DataFailure(422, 'NAME_REQUIRED', 'Enter a name.')
        if (path === '/employees' && rows.some((x) => x.email === r.body?.email))
          throw new DataFailure(409, 'DUPLICATE_EMAIL', 'An employee already uses this email.')
        const row = {
          ...r.body,
          id: `workspace-${++this.sequence}`,
          version: 1,
          ...(path === '/employees' ? { status: 'ACTIVE' } : {}),
        }
        rows.push(row)
        return ok(row, 201, 1)
      }
      const [id, action] = r.path.slice(path.length + 1).split('/')
      const row = rows.find((x) => x.id === id)
      if (!row) throw new DataFailure(404, 'NOT_FOUND', 'This record could not be found.')
      if (r.method === 'GET') return ok(row, 200, Number(row.version))
      this.requireAdmin()
      this.version(r, row)
      if (r.method === 'PATCH' && !action) {
        if (path === '/employees') {
          const p = employeeForm.safeParse(r.body)
          if (!p.success) throw new DataFailure(422, 'VALIDATION_ERROR', p.error.issues[0]!.message)
          if (rows.some((x) => x.id !== id && x.email === p.data.email))
            throw new DataFailure(409, 'DUPLICATE_EMAIL', 'An employee already uses this email.')
        }
        Object.assign(row, r.body, { id, version: Number(row.version) + 1 })
        return ok(row, 200, Number(row.version))
      }
      if (r.method === 'POST' && action === 'terminate' && path === '/employees') {
        if (id === 'demo-employee')
          throw new DataFailure(
            409,
            'DEMO_SELF_CHANGE',
            'The current demo profile cannot be deactivated.',
          )
        row.status = 'INACTIVE'
        row.version = Number(row.version) + 1
        return ok(row, 200, Number(row.version))
      }
      if (r.method === 'DELETE' && !action) {
        rows.splice(rows.indexOf(row), 1)
        return ok(null, 204)
      }
    }
    if (r.path === '/reports/dashboard' && r.method === 'GET') {
      this.requireManager()
      const leave = (
        (await this.base.send({ method: 'GET', path: '/leave/requests/pending' })).data as {
          total: number
        }
      ).total
      const requests = (
        (await this.base.send({ method: 'GET', path: '/requests/pending' })).data as {
          total: number
        }
      ).total
      return ok({
        attendance: Array.from({ length: 5 }, (_, i) => ({
          label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i],
          recorded: i === 2 ? 1 : 2,
          expected: 2,
        })),
        leaveByType: [
          { label: 'Annual leave', value: 5 },
          { label: 'Personal leave', value: 1 },
        ],
        teamSize: this.rows.get('/employees')!.length,
        pendingApprovals: leave + requests,
        dataAsOf: new Date().toISOString(),
      })
    }
    if (r.path === '/reports/exports' && r.method === 'POST') {
      this.requireManager()
      return ok({ id: `export-${++this.sequence}`, status: 'COMPLETED', version: 1 }, 201, 1)
    }
    return this.base.send(r)
  }
  async exportCsv() {
    this.requireManager()
    const list = (
      (await this.base.send({ method: 'GET', path: '/leave/requests/me' })).data as {
        items: RecordData[]
      }
    ).items
    return toCsv([
      ['Employee', 'Type', 'From', 'To', 'Days', 'Status'],
      ...list.map((x) => [x.employeeName, x.type, x.startDate, x.endDate, x.days, x.status]),
    ])
  }
}
