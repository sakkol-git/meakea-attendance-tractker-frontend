import { DataFailure } from '../../../data/source'
import type { DataRequest, DataResponse, RecordData } from '../../../data/source'

const reviewers = [
  { id: 'demo-manager', name: 'Chan Sopheak' },
  { id: 'demo-hr', name: 'Kim Sreyneang' },
  { id: 'demo-owner', name: 'Vann Rith' },
]

export class DemoDelegations {
  private role = 'EMPLOYEE'
  private rows: RecordData[] = []
  private sequence = 0

  setRole(role: string) {
    this.role = role
  }

  reset() {
    this.rows = []
    this.sequence = 0
  }

  handle(request: DataRequest): DataResponse | undefined {
    if (!request.path.startsWith('/approvals/')) return
    this.requireManager()
    if (request.path === '/approvals/eligible-delegates' && request.method === 'GET') {
      const search = String(request.query?.search ?? '').toLocaleLowerCase()
      const items = reviewers.filter(
        (person) =>
          person.id !== this.actorId &&
          (!search || `${person.name} ${person.id}`.toLocaleLowerCase().includes(search)),
      )
      return this.ok({ items, total: items.length })
    }
    if (request.path === '/approvals/delegations' && request.method === 'GET')
      return this.ok({ items: this.rows, total: this.rows.length })
    if (request.path === '/approvals/delegations' && request.method === 'POST')
      return this.create(request.body ?? {})
    if (/^\/approvals\/delegations\/[^/]+$/.test(request.path) && request.method === 'DELETE')
      return this.cancel(request)
  }

  private create(body: RecordData) {
    const delegateId = String(body.delegateId ?? '')
    const startsOn = String(body.startsOn ?? '')
    const endsOn = String(body.endsOn ?? '')
    const reason = String(body.reason ?? '').trim()
    if (
      delegateId === this.actorId ||
      !reviewers.some((person) => person.id === delegateId) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) ||
      endsOn < startsOn ||
      reason.length < 5
    )
      throw new DataFailure(
        422,
        'VALIDATION_ERROR',
        'Choose an eligible reviewer, valid dates and a reason of at least five characters.',
      )
    if (
      this.rows.some(
        (item) =>
          item.status === 'ACTIVE' &&
          String(item.startsOn) <= endsOn &&
          String(item.endsOn) >= startsOn,
      )
    )
      throw new DataFailure(409, 'OVERLAP', 'An active delegation overlaps this period.')
    const reviewer = reviewers.find((person) => person.id === delegateId)!
    const row: RecordData = {
      id: `delegation-${++this.sequence}`,
      delegateId,
      delegateName: reviewer.name,
      startsOn,
      endsOn,
      reason,
      status: 'ACTIVE',
      version: 1,
    }
    this.rows.push(row)
    return this.ok(row, 201, 1)
  }

  private cancel(request: DataRequest) {
    const id = request.path.split('/').at(-1)
    const row = this.rows.find((item) => item.id === id)
    if (!row) throw new DataFailure(404, 'NOT_FOUND', 'Delegation not found.')
    if (!request.ifMatch)
      throw new DataFailure(428, 'VERSION_REQUIRED', 'Refresh this delegation before changing it.')
    if (request.ifMatch !== `"${row.version}"`)
      throw new DataFailure(412, 'STALE_VERSION', 'This delegation changed. Refresh and review it.')
    row.status = 'CANCELLED'
    row.version = Number(row.version) + 1
    return this.ok(row, 200, Number(row.version))
  }

  private get actorId() {
    return this.role === 'MANAGER'
      ? 'demo-manager'
      : this.role === 'HR_ADMIN'
        ? 'demo-hr'
        : 'demo-owner'
  }

  private requireManager() {
    if (this.role === 'EMPLOYEE')
      throw new DataFailure(403, 'FORBIDDEN', 'Management access is required.')
  }

  private ok(data: unknown, status = 200, version?: number): DataResponse {
    return {
      status,
      data: data as DataResponse['data'],
      etag: version ? `"${version}"` : undefined,
    }
  }
}
