import { AttachmentTransfers } from '../features/requests/data/attachment-transfers'
import type { DataSource, RecordData } from './source.ts'
import { DataFailure, commandKey } from './source.ts'
import type { BusinessPort, WorkflowRecord, WorkflowSnapshot } from '../types/business.ts'
import { workflowById } from '../features/workflows/catalog.ts'
import {
  decodeRemote,
  RemoteWorkflowRecord,
  RemoteWorkflowSnapshot,
  SignedDownload,
  signedUrl,
} from '../features/workflows/data/remote-contracts.ts'

interface RemoteBusinessOptions {
  fetcher?: typeof fetch
  allowedFileOrigins?: string[]
  openDownload?: (url: string) => void
}

/**
 * Remote BusinessPort HTTP adapter client for business workflows BF-001 through BF-040.
 *
 * Implements the full HTTP dispatch contract with idempotency keys, ETag version headers,
 * and attachment streaming. As backend domain business endpoints remain in development,
 * workflows are protected by an explicit CONTRACT_REQUIRED gate rather than silent mock fallback.
 */
export class RemoteBusinessAdapter implements BusinessPort {
  private attachments: AttachmentTransfers
  private activeWorkflows = new Set<string>()

  constructor(
    private source: DataSource,
    private guard: () => void = () => {},
    acceptedWorkflows: string[] = [],
    private options: RemoteBusinessOptions = {},
  ) {
    this.attachments = new AttachmentTransfers(source, options)
    for (const id of acceptedWorkflows) {
      this.activeWorkflows.add(id)
    }
  }

  /** Checks whether the backend endpoint is accepted and active. */
  private assertContractAccepted(id: string) {
    if (!this.activeWorkflows.has(id)) {
      throw new DataFailure(
        501,
        'CONTRACT_REQUIRED',
        `Workflow ${id} requires its accepted backend business endpoint. Demo data is never substituted in remote mode.`,
      )
    }
  }

  /** Build canonical API route for a business workflow. */
  private workflowPath(id: string, suffix = ''): string {
    const flow = workflowById(id)
    if (!flow) {
      throw new DataFailure(404, 'UNKNOWN_WORKFLOW', `Workflow ${id} does not exist.`)
    }
    return `/workflows/${id}${suffix}`
  }

  async snapshot(id: string): Promise<WorkflowSnapshot> {
    this.assertContractAccepted(id)
    try {
      const response = await this.source.send({
        method: 'GET',
        path: this.workflowPath(id, '/snapshot'),
      })
      return decodeRemote(RemoteWorkflowSnapshot, response.data) as WorkflowSnapshot
    } catch (e) {
      if (e instanceof DataFailure && (e.status === 404 || e.status === 501)) {
        throw new DataFailure(
          501,
          'CONTRACT_REQUIRED',
          `Backend endpoint for ${id} snapshot is not available.`,
        )
      }
      throw e
    }
  }

  async execute(
    id: string,
    action: string,
    values: RecordData,
    key: string = commandKey(),
    versions: Record<string, number> = {},
  ): Promise<WorkflowRecord> {
    this.guard()
    this.assertContractAccepted(id)

    const flow = workflowById(id)
    if (flow && flow.number >= 31 && flow.number <= 39) {
      throw new DataFailure(
        403,
        'OPERATOR_CONTRACT_REQUIRED',
        'Tenant owner is not an operator grant. Production operational execution requires a separately accepted authorization contract.',
      )
    }

    // Match primary target record if present in version map
    const primaryId = typeof values.recordId === 'string' ? values.recordId : undefined
    const ifMatch =
      primaryId && versions[primaryId] !== undefined ? `"${versions[primaryId]}"` : undefined

    try {
      const response = await this.source.send({
        method: 'POST',
        path: this.workflowPath(id, `/actions/${action}`),
        body: values,
        idempotencyKey: key,
        ifMatch,
      })
      return decodeRemote(RemoteWorkflowRecord, response.data) as WorkflowRecord
    } catch (e) {
      if (e instanceof DataFailure && (e.status === 404 || e.status === 501)) {
        throw new DataFailure(
          501,
          'CONTRACT_REQUIRED',
          `Backend endpoint for ${id} action ${action} is not available.`,
        )
      }
      throw e
    }
  }

  async upload(scope: 'leave' | 'request', ownerId: string, file: File) {
    this.guard()
    if (scope === 'leave') this.assertContractAccepted('BF-026')
    return this.attachments.upload(scope, ownerId, file)
  }

  async download(id: string, recordId: string): Promise<void> {
    this.assertContractAccepted(id)
    const path = this.workflowPath(id, `/records/${encodeURIComponent(recordId)}/download`)
    const response = await this.source.send({
      method: 'GET',
      path,
    })
    const ticket = decodeRemote(SignedDownload, response.data)
    const url = signedUrl(ticket.downloadUrl, new Set(this.options.allowedFileOrigins ?? []))
    const open =
      this.options.openDownload ??
      ((value: string) => {
        globalThis.location.assign(value)
      })
    open(url)
  }

  clear(): void {
    this.attachments.clear()
  }
}
