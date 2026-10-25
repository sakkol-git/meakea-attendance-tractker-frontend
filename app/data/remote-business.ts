import type { DataSource, RecordData } from './source.ts'
import { DataFailure, commandKey } from './source.ts'
import type { BusinessPort, WorkflowRecord, WorkflowSnapshot } from '../types/business.ts'
import { workflowById, workflows } from '../features/workflows/catalog.ts'
import {
  decodeRemote,
  RemoteWorkflowRecord,
  RemoteWorkflowSnapshot,
  SignedDownload,
  SignedUpload,
  signedUrl,
  uploadHeaders,
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
  private activeWorkflows = new Set<string>()

  constructor(
    private source: DataSource,
    private guard: () => void = () => {},
    acceptedWorkflows: string[] = workflows.map((workflow) => workflow.id),
    private options: RemoteBusinessOptions = {},
  ) {
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

  async upload(scope: 'leave' | 'request', ownerId: string, file: File): Promise<WorkflowRecord> {
    this.guard()
    this.assertContractAccepted('BF-026')

    if (!ownerId) throw new DataFailure(422, 'OWNER_REQUIRED', 'Choose a request before attaching.')
    if (file.size > 10 * 1024 * 1024)
      throw new DataFailure(422, 'FILE_TOO_LARGE', 'Choose a file smaller than 10 MB.')
    const allowedTypes = new Set(['application/pdf', 'image/png', 'image/jpeg'])
    if (!allowedTypes.has(file.type))
      throw new DataFailure(422, 'FILE_TYPE_UNSUPPORTED', 'Choose a PDF, PNG or JPEG file.')
    const owner = encodeURIComponent(ownerId)
    const base = scope === 'leave' ? `/leave/requests/${owner}` : `/requests/${owner}`
    try {
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
      const sha256 = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
      const presign = decodeRemote(
        SignedUpload,
        (
          await this.source.send({
            method: 'POST',
            path: `${base}/attachments/presign`,
            body: {
              fileName: file.name,
              contentType: file.type,
              size: file.size,
              sha256,
            },
            idempotencyKey: commandKey(),
          })
        ).data,
      )
      const uploadUrl = signedUrl(presign.uploadUrl, new Set(this.options.allowedFileOrigins ?? []))
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 60_000)
      let uploaded: Response
      try {
        uploaded = await (this.options.fetcher ?? globalThis.fetch)(uploadUrl, {
          method: 'PUT',
          headers: uploadHeaders(presign.requiredHeaders, file.type),
          body: file,
          credentials: 'omit',
          redirect: 'error',
          signal: controller.signal,
        })
      } catch {
        throw new DataFailure(0, 'UPLOAD_FAILED', 'Upload failed. Retry the attachment.')
      } finally {
        clearTimeout(timer)
      }
      if (!uploaded.ok)
        throw new DataFailure(0, 'UPLOAD_FAILED', 'Upload failed. Retry the attachment.')
      const response = await this.source.send({
        method: 'POST',
        path: `${base}/attachments/${encodeURIComponent(presign.attachmentId)}/complete`,
        idempotencyKey: commandKey(),
      })
      return decodeRemote(RemoteWorkflowRecord, response.data) as WorkflowRecord
    } catch (e) {
      if (e instanceof DataFailure && (e.status === 404 || e.status === 501)) {
        throw new DataFailure(
          501,
          'CONTRACT_REQUIRED',
          `Attachment upload endpoint for ${scope} is not available.`,
        )
      }
      throw e
    }
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
    // Adapter is stateless; cache clears can be handled here if caching is added
  }
}
