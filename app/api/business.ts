import type { WorkspaceApi } from './workspace'
import type { BusinessPort } from '../types/business'
import type { RecordData } from '../data/source'
import { DataFailure } from '../data/source'
import { BusinessDemo } from '../data/business-demo'
import { workflowById } from '../features/workflows/catalog'
export type { WorkflowRecord, WorkflowSnapshot, BusinessPort } from '../types/business'

/** UI-facing API. Production adapters implement BusinessPort once their contract is accepted. */
export class BusinessApi implements BusinessPort {
  private port?: BusinessPort
  private epoch = 0
  constructor(
    private core: WorkspaceApi,
    private guard: () => void,
    private acceptedAdapter?: BusinessPort,
  ) {
    this.port =
      acceptedAdapter ?? (core.mode === 'local' ? new BusinessDemo(core, guard) : undefined)
  }
  private async authorized(id: string) {
    const flow = workflowById(id)
    if (!flow) throw new DataFailure(404, 'UNKNOWN_WORKFLOW', 'This workflow does not exist.')
    const profile = await this.core.profile()
    if (!profile.roles.some((role) => flow.roles.includes(role)))
      throw new DataFailure(403, 'FORBIDDEN', 'Your role cannot use this workflow.')
    if (!this.port)
      throw new DataFailure(
        501,
        'CONTRACT_REQUIRED',
        'This workflow needs its accepted backend contract. Demo data is never substituted in remote mode.',
      )
    return this.port
  }
  private async deliver<T>(
    id: string,
    operation: (port: BusinessPort) => Promise<T>,
    mutation = false,
  ): Promise<T> {
    const epoch = this.epoch
    const port = await this.authorized(id)
    if (epoch !== this.epoch)
      throw new DataFailure(
        401,
        'SESSION_CHANGED',
        'The session changed. No old-account result can be displayed.',
      )
    if (
      mutation &&
      this.core.mode === 'remote' &&
      workflowById(id)!.number >= 31 &&
      workflowById(id)!.number <= 39
    )
      throw new DataFailure(
        403,
        'OPERATOR_CONTRACT_REQUIRED',
        'Tenant owner is not an operator grant. Production operational execution requires a separately accepted authorization contract.',
      )
    const result = await operation(port)
    if (epoch !== this.epoch)
      throw new DataFailure(
        401,
        'SESSION_CHANGED',
        'The session changed. No old-account result can be displayed.',
      )
    return result
  }
  async snapshot(id: string) {
    return this.deliver(id, (port) => port.snapshot(id))
  }
  async execute(
    id: string,
    action: string,
    values: RecordData,
    key: string,
    versions: Record<string, number> = {},
  ) {
    this.guard()
    return this.deliver(id, (port) => port.execute(id, action, values, key, versions), true)
  }
  async upload(scope: 'leave' | 'request', ownerId: string, file: File) {
    this.guard()
    return this.deliver('BF-026', (port) => port.upload(scope, ownerId, file), true)
  }
  async download(id: string, recordId: string) {
    return this.deliver(id, (port) => port.download(id, recordId))
  }
  clear() {
    this.epoch++
    this.port?.clear()
    if (!this.acceptedAdapter && this.core.mode === 'local')
      this.port = new BusinessDemo(this.core, this.guard)
  }
}
