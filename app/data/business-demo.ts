import type { WorkspaceApi } from '../api/workspace'
import { DataFailure, commandKey } from '../data/source'
import type { RecordData } from '../data/source'
import type { Resource, UserProfile } from '../types/workspace'
import { workflowById } from '../features/workflows/catalog'
import { workflowActions } from '../features/workflows/forms'
import { toCsv, tenantDay } from '../utils/format'
import type { WorkflowRecord, WorkflowSnapshot } from '../types/business'
const clone = <T>(x: T): T => structuredClone(x)
const today = (timeZone = 'Asia/Phnom_Penh') =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
const day = (x: unknown) => {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false
  const date = new Date(`${x}T12:00:00Z`)
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === x
}
/** Advanced client preview seam. No unapproved HTTP routes are silently invented. */
export class BusinessDemo {
  private rows = new Map<number, WorkflowRecord[]>()
  private receipts = new Map<string, { signature: string; result: WorkflowRecord }>()
  private files = new Map<string, File>()
  private busy = new Set<string>()
  private commandQueue: Promise<void> = Promise.resolve()
  private generation = 0
  constructor(
    private core: WorkspaceApi,
    private guard: () => void,
  ) {}
  private async actor(id: string): Promise<UserProfile> {
    const flow = workflowById(id)
    if (!flow) throw new DataFailure(404, 'UNKNOWN_WORKFLOW', 'This workflow does not exist.')
    const profile = await this.core.profile()
    if (!profile.roles.some((x) => flow.roles.includes(x)))
      throw new DataFailure(403, 'FORBIDDEN', 'Your role cannot use this workflow.')
    if (this.core.mode !== 'local')
      throw new DataFailure(
        501,
        'CONTRACT_REQUIRED',
        'This advanced workflow needs its accepted backend contract. Demo data is never substituted in remote mode.',
      )
    return profile
  }
  private add(n: number, title: string, status: string, details: RecordData, actor: string) {
    const row: WorkflowRecord = {
      id: commandKey(),
      title,
      status,
      version: 1,
      createdAt: new Date().toISOString(),
      details: clone(details),
      history: [{ at: new Date().toISOString(), action: status, actor }],
    }
    const list = this.rows.get(n) ?? []
    list.unshift(row)
    this.rows.set(n, list)
    return row
  }
  private update(row: WorkflowRecord, status: string, actor: string, details: RecordData = {}) {
    row.status = status
    row.version++
    Object.assign(row.details, details)
    row.history.push({ at: new Date().toISOString(), action: status, actor })
    return row
  }
  private find(n: number, id: unknown) {
    const row = this.rows.get(n)?.find((x) => x.id === id)
    if (!row)
      throw new DataFailure(404, 'NOT_FOUND', 'Select a current record reference from the list.')
    return row
  }
  async snapshot(id: string): Promise<WorkflowSnapshot> {
    const actor = await this.actor(id)
    const n = workflowById(id)!.number
    if (!this.rows.has(n)) {
      this.rows.set(n, [])
      if (n === 11)
        this.add(
          n,
          'Yesterday’s proposed workday',
          'PENDING',
          {
            workDate: today(actor.timeZone),
            clockIn: '09:05',
            clockOut: '17:00',
            source: 'INFERRED',
            employeeId: actor.employeeId,
          },
          'Demo evidence fixture',
        )
      if (n === 20)
        this.add(
          n,
          'Approved leave overlaps reported presence',
          'NEEDS_REVIEW',
          {
            workDate: today(actor.timeZone),
            leave: 'APPROVED',
            evidence: 'TAP',
            employeeId: actor.employeeId,
            policy: 'UNRESOLVED',
          },
          'Demo conflict fixture',
        )
      if (n === 27)
        this.add(
          n,
          'Request decision email',
          'FAILED',
          {
            channel: 'EMAIL',
            category: 'REQUESTS',
            attempts: 1,
            error: 'Synthetic provider unavailable',
          },
          'Demo delivery fixture',
        )
      if (n === 33)
        this.add(
          n,
          'Private model information',
          'DEMO_ONLY',
          {
            mode: 'Rules preview',
            autoThreshold: 0.8,
            askThreshold: 0.5,
            workerAccess: 'No browser access to private worker',
          },
          'Inspection',
        )
      if ([35, 36, 37, 38, 39].includes(n))
        this.add(
          n,
          workflowById(id)!.title,
          'NOT_VERIFIED',
          {
            checkpoint: 'Not connected',
            readiness: 'Unknown',
            boundary:
              'Readiness is not proven by a health endpoint. Owner role is not a production operator grant.',
          },
          'Demo operations fixture',
        )
    }
    for (const row of this.rows.get(n)!)
      if (row.status === 'QUEUED' && Date.now() - Date.parse(row.createdAt) > 1200)
        this.update(row, 'COMPLETED', 'Synthetic job runner', {
          result: 'Demo-only staged operation completed; no production system was changed.',
        })
    const references: { id: string; name: string; version?: number; kind?: string }[] = []
    if ([4, 5, 18, 19].includes(n) && actor.roles.some((x) => ['HR_ADMIN', 'OWNER'].includes(x)))
      for (const row of (await this.core.list('employees')).items)
        references.push({
          id: row.id,
          version: row.version,
          kind: 'employee',
          name: row.name ?? row.id,
        })
    if (n === 5)
      for (const row of (await this.core.list('shifts')).items)
        references.push({
          id: row.id,
          version: row.version,
          kind: 'shift',
          name: row.name ?? row.id,
        })
    if ([17].includes(n))
      for (const row of (await this.core.list('myLeaves')).items)
        references.push({
          id: row.id,
          version: row.version,
          kind: 'leave',
          name: `${row.type} · ${row.status} · ${row.startDate}`,
        })
    if ([22, 25].includes(n))
      for (const row of (await this.core.list('myRequests')).items)
        references.push({
          id: row.id,
          version: row.version,
          kind: 'request',
          name: `${row.title} · ${row.status}`,
        })
    if (n === 25)
      for (const row of (await this.core.list('materials')).items)
        references.push({
          id: row.id,
          version: row.version,
          kind: 'material',
          name: `${row.name} · ${row.quantity ?? 0} available`,
        })
    if (n === 26)
      for (const resource of ['myLeaves', 'myRequests'] as const)
        for (const row of (await this.core.list(resource)).items)
          references.push({
            id: row.id,
            version: row.version,
            kind: resource === 'myLeaves' ? 'leave' : 'request',
            name: `${resource === 'myLeaves' ? 'Leave' : 'Request'} · ${row.title ?? row.type} · ${row.id}`,
          })
    const resources: Partial<Record<number, Resource>> = {
      4: 'employees',
      6: 'holidays',
      12: 'corrections',
      14: 'myLeaves',
      15: 'pendingLeaves',
      16: 'pendingLeaves',
      21: 'myRequests',
      22: 'myRequests',
      23: 'pendingRequests',
      24: 'myRequests',
      25: 'myRequests',
    }
    if ([7, 8].includes(n)) {
      const current = await this.core.today()
      this.rows.set(
        n,
        current.sessions.map((row) => ({
          id: row.id,
          title: 'Recorded work session',
          status: row.clockOut ? 'CLOSED' : 'OPEN',
          version: row.version,
          createdAt: row.clockIn,
          details: { ...row, workDate: current.date },
          history: [],
        })),
      )
    }
    if (n === 18) {
      for (const balance of (await this.core.balances()).items) {
        const current = this.rows
          .get(n)!
          .find(
            (row) =>
              row.status === 'BALANCE' &&
              row.details.type === balance.type &&
              row.details.year === balance.year &&
              row.details.employeeId === actor.employeeId,
          )
        if (!current)
          this.add(
            n,
            `${balance.type} balance · ${balance.year}`,
            'BALANCE',
            { ...balance, employeeId: actor.employeeId },
            actor.name,
          )
        else if (
          current.details.available !== balance.available ||
          current.details.pending !== balance.pending
        )
          this.update(current, 'BALANCE', 'Balance refresh', {
            ...balance,
            employeeId: actor.employeeId,
          })
      }
    }
    const resource = resources[n]
    const coreRows: WorkflowRecord[] = resource
      ? (await this.core.list(resource)).items.map((row) => ({
          id: row.id,
          title: row.title ?? row.name ?? row.type ?? 'Attendance issue',
          status: row.status ?? 'ACTIVE',
          version: row.version,
          createdAt: row.createdAt ?? '',
          details: JSON.parse(JSON.stringify(row)) as RecordData,
          history: (row.history ?? []).map((h) => ({
            at: h.at,
            action: h.status,
            actor: 'Recorded workflow',
          })),
        }))
      : []
    return clone({
      items: [...this.rows.get(n)!, ...coreRows].filter(
        (row) =>
          ![5, 11, 18, 26].includes(n) ||
          actor.roles.some((x) => ['HR_ADMIN', 'OWNER'].includes(x)) ||
          !row.details.employeeId ||
          row.details.employeeId === actor.employeeId,
      ),
      references,
      note:
        n >= 31 && n <= 39
          ? 'Operator/ML preview. No production authority, health, model training or message delivery is implied.'
          : 'Explicit synthetic workflow state. Unsettled production policies remain review requirements.',
    })
  }
  async execute(
    id: string,
    action: string,
    values: RecordData,
    key: string,
    versions: Record<string, number> = {},
  ): Promise<WorkflowRecord> {
    const generation = this.generation
    const next = this.commandQueue.then(() => {
      if (generation !== this.generation)
        throw new DataFailure(
          401,
          'SESSION_CHANGED',
          'The preview session changed before this command started.',
        )
      return this.applyCommand(id, action, values, key, versions)
    })
    this.commandQueue = next.then(
      () => {},
      () => {},
    )
    return next
  }
  private async applyCommand(
    id: string,
    action: string,
    values: RecordData,
    key: string,
    versions: Record<string, number> = {},
  ): Promise<WorkflowRecord> {
    this.guard()
    const actor = await this.actor(id)
    const flow = workflowById(id)!
    if (
      [5, 18].includes(flow.number) &&
      !actor.roles.some((x) => ['HR_ADMIN', 'OWNER'].includes(x))
    )
      throw new DataFailure(
        403,
        'HR_REQUIRED',
        'Only HR can change assignments or entitlement. You can inspect your own records.',
      )
    const spec = workflowActions(flow.number).find((x) => x.key === action)
    if (!spec) throw new DataFailure(400, 'INVALID_ACTION', 'Choose an available action.')
    const scope = `${actor.tenantId}:${actor.roles.join(',')}:${id}:${key}`
    const signature = JSON.stringify([
      action,
      values,
      values.recordId ? versions[String(values.recordId)] : undefined,
    ])
    const saved = this.receipts.get(scope)
    if (saved) {
      if (saved.signature !== signature)
        throw new DataFailure(409, 'IDEMPOTENCY_CONFLICT', 'This key belongs to another command.')
      return clone(saved.result)
    }
    if (this.busy.has(scope))
      throw new DataFailure(
        409,
        'IN_PROGRESS',
        'This command is already running. Inspect its state before retrying.',
      )
    for (const f of spec.fields) {
      const v = values[f.key]
      if (
        f.required &&
        (v === undefined ||
          v === '' ||
          (typeof v === 'string' && !v.trim()) ||
          (f.type === 'checkbox' && v !== true))
      )
        throw new DataFailure(422, 'VALIDATION_ERROR', `${f.label} is required.`)
      if (v === undefined || v === '') continue
      if (
        f.type === 'number' &&
        (typeof v !== 'number' ||
          !Number.isFinite(v) ||
          v < (f.min ?? -Infinity) ||
          v > (f.max ?? Infinity) ||
          Math.abs(v / (f.step ?? 1) - Math.round(v / (f.step ?? 1))) > 1e-8)
      )
        throw new DataFailure(422, 'VALIDATION_ERROR', `${f.label} is outside the supported range.`)
      if (f.type === 'time' && !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(String(v)))
        throw new DataFailure(422, 'INVALID_TIME', `${f.label} must use a real 24-hour time.`)
      if (f.type === 'date' && !day(v))
        throw new DataFailure(422, 'INVALID_DATE', `${f.label} must be a real calendar date.`)
      if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))
        throw new DataFailure(422, 'INVALID_EMAIL', 'Enter a valid email.')
      if (f.options && !f.options.includes(String(v)))
        throw new DataFailure(422, 'INVALID_OPTION', `${f.label} has an invalid choice.`)
      if (typeof v === 'string' && v.length > 2000)
        throw new DataFailure(422, 'TOO_LONG', 'Keep fields under 2,000 characters.')
    }
    if (values.reason !== undefined && String(values.reason).trim().length < 5)
      throw new DataFailure(422, 'REASON_REQUIRED', 'Give a reason in at least five characters.')
    if (values.startDate && values.endDate && String(values.endDate) < String(values.startDate))
      throw new DataFailure(422, 'INVALID_RANGE', 'The end must not be before the start.')
    if (values.recordId) {
      const row =
        (this.rows.get(flow.number) ?? []).find((x) => x.id === values.recordId) ??
        (flow.number === 11 ? this.rows.get(10)?.find((x) => x.id === values.recordId) : undefined)
      if (row && versions[row.id] !== row.version)
        throw new DataFailure(
          412,
          'STALE_VERSION',
          'This record changed. Refresh and review it before deciding.',
        )
    }
    if ([17, 22, 25].includes(flow.number) && values.recordId) {
      const resource = flow.number === 17 ? 'leaves' : 'requests'
      const current = (await this.core.detail(resource, String(values.recordId))).row
      if (versions[current.id] !== current.version)
        throw new DataFailure(
          412,
          'STALE_VERSION',
          'Refresh and review the record before changing it.',
        )
    }
    this.busy.add(scope)
    try {
      const row = await this.perform(
        flow.number,
        action,
        {
          ...values,
          ...([17, 22, 25].includes(flow.number) && values.recordId
            ? { expectedVersion: versions[String(values.recordId)]! }
            : {}),
        },
        actor,
      )
      this.receipts.set(scope, { signature, result: clone(row) })
      return clone(row)
    } finally {
      this.busy.delete(scope)
    }
  }
  private async perform(
    n: number,
    action: string,
    v: RecordData,
    p: UserProfile,
  ): Promise<WorkflowRecord> {
    const actor = p.name
    const record = (title: string, status: string, details: RecordData = v) =>
      this.add(n, title, status, details, actor)
    if (n === 2) {
      const existing = this.rows.get(n)?.[0]
      if (action === 'reuse') {
        if (!existing) throw new DataFailure(409, 'NO_FAMILY', 'Preview a rotation first.')
        return this.update(existing, 'REVOKED', actor, { reuseDetected: true })
      }
      if (existing?.status === 'REVOKED')
        throw new DataFailure(
          401,
          'FAMILY_REVOKED',
          'The demo family was revoked. Start a new real sign-in to regain a live session.',
        )
      return record('Synthetic refresh family', 'ROTATED', {
        generation: (this.rows.get(n)?.length ?? 0) + 1,
        tokensVisible: false,
      })
    }
    if (n === 3) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: String(v.timeZone) }).format()
      } catch {
        throw new DataFailure(
          422,
          'INVALID_TIMEZONE',
          'Enter a valid IANA time zone, such as Asia/Phnom_Penh.',
        )
      }
      if (this.rows.get(n)?.some((x) => x.details.name === v.name))
        throw new DataFailure(409, 'DUPLICATE_COMPANY', 'This demo company already exists.')
      return record(String(v.name), 'PROVISIONED', {
        ...v,
        invitation: 'Prepared locally; no message sent',
        currentWorkspaceUnchanged: true,
      })
    }
    if (n === 4) {
      if (!(await this.core.list('employees')).items.some((x) => x.id === v.employeeId))
        throw new DataFailure(422, 'EMPLOYEE_REQUIRED', 'Create the employee in People first.')
      return record(`Account invitation for ${v.email}`, 'PREPARED', v)
    }
    if (n === 5) {
      if (action === 'close') {
        const row = this.find(n, v.recordId)
        if (row.status !== 'ASSIGNED')
          throw new DataFailure(409, 'INVALID_STATE', 'Only an active assignment can be closed.')
        if (String(v.endDate) < String(row.details.startDate))
          throw new DataFailure(422, 'INVALID_RANGE', 'Closure cannot precede the assignment.')
        return this.update(row, 'CLOSED', actor, v)
      }
      if (
        !(await this.core.list('employees')).items.some((x) => x.id === v.employeeId) ||
        !(await this.core.list('shifts')).items.some((x) => x.id === v.shiftId)
      )
        throw new DataFailure(422, 'INVALID_REFERENCE', 'Choose an existing employee and shift.')
      if (
        this.rows
          .get(n)
          ?.some(
            (x) =>
              x.details.employeeId === v.employeeId &&
              x.status !== 'VOID' &&
              String(x.details.startDate) <= String(v.endDate || '9999-12-31') &&
              String(x.details.endDate || '9999-12-31') >= String(v.startDate),
          )
      )
        throw new DataFailure(
          409,
          'ASSIGNMENT_OVERLAP',
          'Effective assignment periods cannot overlap.',
        )
      return record(`Shift ${v.shiftId} for ${v.employeeId}`, 'ASSIGNED', v)
    }
    if (n === 9)
      return record(`Aggregate evidence · ${v.workDate}`, 'RECORDED', {
        ...v,
        employeeId: p.employeeId,
        rawLocationStored: false,
      })
    if (n === 10) {
      if (String(v.clockOut) <= String(v.clockIn))
        throw new DataFailure(
          422,
          'OVERNIGHT_POLICY_REQUIRED',
          'Use a same-day interval for this preview; overnight policy is unresolved.',
        )
      const status =
        Number(v.confidence) >= 0.8
          ? 'PENDING'
          : Number(v.confidence) >= 0.5
            ? 'PROMPT_ONLY'
            : 'NO_ACTION'
      const row = record(`Inference · ${v.workDate}`, status, {
        ...v,
        employeeId: p.employeeId,
        source: 'INFERRED',
      })
      if (status === 'PENDING') {
        const list = this.rows.get(11) ?? []
        list.unshift(row)
        this.rows.set(11, list)
      }
      return row
    }
    if (n === 11) {
      const row = this.find(n, v.recordId)
      if (row.details.employeeId !== p.employeeId)
        throw new DataFailure(
          403,
          'NOT_OWNER',
          'Only the employee can confirm or reject their proposed presence.',
        )
      if (row.status !== 'PENDING')
        throw new DataFailure(409, 'INVALID_STATE', 'This proposal has already been reviewed.')
      return this.update(row, action === 'confirm' ? 'CONFIRMED' : 'REJECTED', actor, {
        reason: v.reason ?? '',
      })
    }
    if (n === 13) {
      const rows = (await this.core.attendance()).items.filter(
        (x) => tenantDay(x.clockIn, p.timeZone) === v.workDate,
      )
      const open = rows.some((x) => !x.clockOut)
      const minutes = rows.reduce(
        (sum, x) =>
          sum +
          (x.clockOut ? Math.max(0, (Date.parse(x.clockOut) - Date.parse(x.clockIn)) / 60000) : 0),
        0,
      )
      return record(
        `Employee-day · ${v.workDate}`,
        open ? 'OPEN_INTERVAL' : 'POLICY_REVIEW_REQUIRED',
        {
          ...v,
          workedMinutes: minutes,
          sessionCount: rows.length,
          finalized: false,
          note: 'Breaks, cutoffs, conflicts and DST require server policy.',
        },
      )
    }
    if (n === 17) {
      const item = await this.core.detail('leaves', String(v.recordId))
      if (item.row.version !== v.expectedVersion)
        throw new DataFailure(
          412,
          'STALE_VERSION',
          'This request changed. Refresh and review it before cancelling.',
        )
      if (
        item.row.status !== 'APPROVED' ||
        !item.row.startDate ||
        item.row.startDate <= today(p.timeZone)
      )
        throw new DataFailure(
          409,
          'NOT_ELIGIBLE',
          'Only whole future approved requests can be cancelled.',
        )
      await this.core.change('leaves', item.row.id, 'cancel', item.row.version, {
        reason: v.reason!,
      })
      return record(`Cancelled ${item.row.type}`, 'CANCELLED', v)
    }
    if (n === 18) {
      if (Number(v.days) === 0)
        throw new DataFailure(422, 'ZERO_ADJUSTMENT', 'An adjustment must change the balance.')
      await this.core.adjustBalance(v)
      return record(`Entitlement adjustment · ${v.type}`, 'POSTED', {
        ...v,
        halfDayUnits: Number(v.days) * 2,
      })
    }
    if (n === 19) {
      if (action === 'commit') {
        const row = this.find(n, v.recordId)
        if (row.status !== 'PREVIEW')
          throw new DataFailure(409, 'INVALID_STATE', 'This preview was already applied.')
        if (
          this.rows
            .get(19)
            ?.some(
              (x) =>
                x.id !== row.id &&
                x.status === 'APPLIED' &&
                x.details.employeeId === row.details.employeeId &&
                x.details.year === row.details.year &&
                x.details.targetYear === row.details.targetYear,
            )
        )
          throw new DataFailure(
            409,
            'ROLLOVER_ALREADY_APPLIED',
            'Carry-over was already applied for this employee and year.',
          )
        if (Number(row.details.carryDays) > 0)
          await this.core.adjustBalance({
            employeeId: row.details.employeeId!,
            year: row.details.targetYear!,
            type: 'Annual leave',
            days: row.details.carryDays!,
            reason: v.reason!,
          })
        return this.update(row, 'APPLIED', actor, { reason: v.reason! })
      }
      if (Number(v.targetYear) !== Number(v.year) + 1)
        throw new DataFailure(
          422,
          'INVALID_YEAR',
          'Target year must immediately follow the source year.',
        )
      const balances = await this.core.balances(Number(v.year), String(v.employeeId))
      const balance = balances.items.find((x) => x.type === 'Annual leave')
      if (balance?.pending)
        throw new DataFailure(
          409,
          'PENDING_POLICY_REQUIRED',
          'Pending leave exists. Its cross-year settlement policy must be approved before rollover.',
        )
      return record('Annual leave carry-over preview', 'PREVIEW', {
        ...v,
        carryDays: Math.max(0, Math.min(balance?.available ?? 0, Number(v.carryCap))),
      })
    }
    if (n === 20) {
      const row = this.find(n, v.recordId)
      if (row.status !== 'NEEDS_REVIEW')
        throw new DataFailure(409, 'INVALID_STATE', 'This conflict was already reviewed.')
      return this.update(row, 'REVIEW_RECORDED', actor, v)
    }
    if (n === 22) {
      const request = (await this.core.detail('requests', String(v.recordId))).row
      if (request.status !== 'DRAFT')
        throw new DataFailure(409, 'INVALID_STATE', 'Preview routing before submitting the draft.')
      return record('Approval routing preview', 'PREVIEW', {
        ...v,
        steps: v.chain === 'MANAGER_THEN_HR' ? ['MANAGER', 'HR_ADMIN'] : ['MANAGER'],
        grantsAuthorization: false,
      })
    }
    if (n === 25) {
      await this.core.issueMaterial(v)
      return record(`Material issue · ${v.recordId}`, 'ISSUED', v)
    }
    if (n === 27) {
      const row = this.find(n, v.recordId)
      if (row.status !== 'FAILED')
        throw new DataFailure(409, 'INVALID_STATE', 'Only failed deliveries are retryable.')
      return this.update(row, 'DEMO_DELIVERED', actor, {
        attempts: Number(row.details.attempts) + 1,
        externalMessageSent: false,
      })
    }
    if (n === 28) {
      if (v.category === 'SECURITY' && !v.email && !v.inApp)
        throw new DataFailure(
          422,
          'SECURITY_CHANNEL_REQUIRED',
          'Keep at least one security channel enabled.',
        )
      if (!!v.quietStart !== !!v.quietEnd)
        throw new DataFailure(422, 'QUIET_HOURS_REQUIRED', 'Provide both quiet-hour endpoints.')
      return record(`${v.category} preferences`, 'SAVED', v)
    }
    if (n === 29) {
      const sessions = (await this.core.attendance()).items.filter(
        (x) =>
          tenantDay(x.clockIn, p.timeZone) >= String(v.startDate) &&
          tenantDay(x.clockIn, p.timeZone) <= String(v.endDate),
      )
      return record('Attendance query result', 'COMPLETE', {
        ...v,
        count: sessions.length,
        dataAsOf: new Date().toISOString(),
        scope: 'Current employee; broader scope requires accepted report contract',
      })
    }
    if (n === 30) {
      if (action === 'cancel') {
        const row = this.find(n, v.recordId)
        if (row.status !== 'QUEUED')
          throw new DataFailure(409, 'INVALID_STATE', 'Only queued exports can be cancelled.')
        return this.update(row, 'CANCELLED', actor)
      }
      return record('Leave CSV export', 'QUEUED', { ...v, format: 'CSV' })
    }
    if (n === 32) {
      const score = v.mockLocation
        ? 0
        : Math.min(
            1,
            0.3 * Number(!!v.inGeofence) +
              0.15 * Number(!!v.wifiConnected) +
              (0.15 * Math.min(Number(v.ble), 3)) / 3 +
              (0.15 * Math.min(Number(v.movement), 20)) / 20 +
              (0.1 * Math.min(Number(v.interaction), 10)) / 10 +
              0.05 * Number(!!v.usualDevice) +
              (0.1 * Math.min(Number(v.presentDays), 10)) / 10,
          )
      return record('Rules-only confidence preview', 'SCORED', {
        ...v,
        score: Math.round(score * 10000) / 10000,
        decision: score >= 0.8 ? 'AUTO_MARK' : score >= 0.5 ? 'ASK_EMPLOYEE' : 'NO_ACTION',
        attendanceCreated: false,
        model: 'Documented rules formula; not the trained model',
      })
    }
    if ([31, 34, 35, 36, 37, 38].includes(n))
      return record(
        `Synthetic ${workflowById(`BF-${String(n).padStart(3, '0')}`)!.title}`,
        'QUEUED',
        {
          ...v,
          simulation: true,
          productionChanged: false,
          stages: ['VALIDATE', 'EXECUTE_PREVIEW', 'VERIFY_PREVIEW'],
        },
      )
    throw new DataFailure(400, 'INVALID_ACTION', 'This action is unavailable.')
  }
  async upload(scope: 'leave' | 'request', ownerId: string, file: File): Promise<WorkflowRecord> {
    this.guard()
    const actor = await this.actor('BF-026')
    const entity = await this.core.detail(scope === 'leave' ? 'leaves' : 'requests', ownerId)
    if (
      entity.row.employeeId !== actor.employeeId &&
      !actor.roles.some((x) => ['MANAGER', 'HR_ADMIN', 'OWNER'].includes(x))
    )
      throw new DataFailure(403, 'NOT_OWNER', 'You cannot attach a file to this record.')
    if (!file.size || file.size > 10 * 1024 * 1024)
      throw new DataFailure(
        422,
        'FILE_SIZE',
        'Choose a non-empty file no larger than the 10 MiB demo limit.',
      )
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
    const valid =
      (file.type === 'application/pdf' && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-') ||
      (file.type === 'image/png' &&
        bytes[0] === 137 &&
        bytes[1] === 80 &&
        bytes[2] === 78 &&
        bytes[3] === 71) ||
      (file.type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    if (!valid)
      throw new DataFailure(
        422,
        'FILE_TYPE',
        'The file content must match a PDF, PNG or JPEG. Browser checking is not malware scanning.',
      )
    const row = this.add(
      26,
      file.name.replace(/[\r\n]/g, ''),
      'LOCAL_READY',
      {
        scope,
        ownerId,
        size: file.size,
        mime: file.type,
        employeeId: actor.employeeId,
        scan: 'Not malware-scanned; local demo only',
      },
      actor.name,
    )
    this.files.set(row.id, file)
    return clone(row)
  }
  clear() {
    this.generation++
    this.rows.clear()
    this.files.clear()
    this.receipts.clear()
    this.busy.clear()
  }
  async download(id: string, recordId: string) {
    const actor = await this.actor(id)
    const row = this.find(workflowById(id)!.number, recordId)
    let blob: Blob
    if (id === 'BF-026') {
      if (
        row.details.employeeId !== actor.employeeId &&
        !actor.roles.some((x) => ['MANAGER', 'HR_ADMIN', 'OWNER'].includes(x))
      )
        throw new DataFailure(403, 'NOT_OWNER', 'This file belongs to another employee.')
      const file = this.files.get(recordId)
      if (!file)
        throw new DataFailure(410, 'FILE_EXPIRED', 'This local file is no longer available.')
      blob = file
    } else {
      if (row.status !== 'COMPLETED')
        throw new DataFailure(409, 'NOT_READY', 'Wait for the export to complete.')
      const leaves = (await this.core.list('myLeaves')).items.filter(
        (x) =>
          (x.startDate ?? '') >= String(row.details.startDate) &&
          (x.startDate ?? '') <= String(row.details.endDate),
      )
      blob = new Blob(
        [
          toCsv([
            ['Type', 'From', 'Through', 'Status'],
            ...leaves.map((x) => [x.type, x.startDate, x.endDate, x.status]),
          ]),
        ],
        { type: 'text/csv;charset=utf-8' },
      )
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = id === 'BF-026' ? row.title : 'hrflow-leave-export.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
