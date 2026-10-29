import type { DataSource, RecordData } from '../../../data/source'
import { DataFailure, commandKey } from '../../../data/source'
import type { WorkflowRecord } from '../../../types/business'
import {
  decodeRemote,
  RemoteWorkflowRecord,
  SignedUpload,
  signedUrl,
  uploadHeaders,
} from '../../workflows/data/remote-contracts'

export interface AttachmentTransferOptions {
  fetcher?: typeof fetch
  allowedFileOrigins?: string[]
}
export class AttachmentTransfers {
  private attempts = new Map<string, string>()
  constructor(
    private source: DataSource,
    private options: AttachmentTransferOptions = {},
  ) {}
  private key(scope: string) {
    let key = this.attempts.get(scope)
    if (!key) {
      key = commandKey()
      this.attempts.set(scope, key)
    }
    return key
  }
  async upload(scope: 'leave' | 'request', ownerId: string, file: File): Promise<WorkflowRecord> {
    if (!ownerId) throw new DataFailure(422, 'OWNER_REQUIRED', 'Choose a request before attaching.')
    if (file.size === 0 || file.size > 10 * 1024 * 1024)
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
      const signature = JSON.stringify([scope, ownerId, file.name, file.type, sha256])
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
            idempotencyKey: this.key(`${signature}:presign`),
          })
        ).data,
      )
      if (presign.uploadUrl.startsWith('/')) {
        const path = `${base}/attachments/${encodeURIComponent(presign.attachmentId)}/upload`
        if (scope !== 'request' || presign.uploadUrl !== `/api/v1${path}`)
          throw new DataFailure(
            0,
            'INVALID_FILE_URL',
            'The upload link does not match this private attachment.',
          )
        uploadHeaders(presign.requiredHeaders, file.type)
        await this.source.send({
          method: 'PUT',
          path,
          bytes: new Uint8Array(await file.arrayBuffer()),
          contentType: file.type,
        })
      } else {
        const uploadUrl = signedUrl(
          presign.uploadUrl,
          new Set(this.options.allowedFileOrigins ?? []),
        )
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
      }
      const response = await this.source.send({
        method: 'POST',
        path: `${base}/attachments/${encodeURIComponent(presign.attachmentId)}/complete`,
        idempotencyKey: this.key(`${signature}:complete`),
      })
      const result = decodeRemote(RemoteWorkflowRecord, response.data) as WorkflowRecord
      this.attempts.delete(`${signature}:presign`)
      this.attempts.delete(`${signature}:complete`)
      return result
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

  clear() {
    this.attempts.clear()
  }
}
