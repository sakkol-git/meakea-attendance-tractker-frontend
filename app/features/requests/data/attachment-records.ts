import { z } from 'zod'
import type { DataSource } from '../../../data/source'
import { DataFailure } from '../../../data/source'
import { decode } from '../../../schemas/contracts'

const Attachment = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  contentType: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
  status: z.string(),
  createdAt: z.string(),
})
export interface AttachmentItem {
  id: string
  name: string
  size: number
  contentType: string
  uploadedAt: string
}
function requestPath(scope: 'request' | 'leave', id: string) {
  if (scope !== 'request')
    throw new DataFailure(
      501,
      'CONTRACT_REQUIRED',
      'Leave attachments are not available in this workspace.',
    )
  return `/requests/${encodeURIComponent(id)}`
}
export async function attachmentItems(
  source: DataSource,
  scope: 'request' | 'leave',
  id: string,
): Promise<AttachmentItem[]> {
  const response = await source.send({ method: 'GET', path: requestPath(scope, id) })
  const detail = decode(z.object({ attachments: z.array(Attachment) }), response.data)
  return detail.attachments
    .filter((file) => file.status === 'FINALIZED')
    .map((file) => ({
      id: file.id,
      name: file.fileName,
      size: file.fileSize,
      contentType: file.contentType,
      uploadedAt: file.createdAt,
    }))
}
export async function privateAttachmentBytes(
  source: DataSource,
  scope: 'request' | 'leave',
  id: string,
  attachmentId: string,
) {
  const path = `${requestPath(scope, id)}/attachments/${encodeURIComponent(attachmentId)}`
  const ticket = decode(
    z.object({ downloadUrl: z.string() }),
    (await source.send({ method: 'GET', path: `${path}/download` })).data,
  )
  if (ticket.downloadUrl !== `/api/v1${path}/file`)
    throw new DataFailure(
      0,
      'INVALID_FILE_URL',
      'The download link does not match this private attachment.',
    )
  const response = await source.send({ method: 'GET', path: `${path}/file`, responseType: 'bytes' })
  return decode(
    z
      .array(z.number().int().min(0).max(255))
      .min(1)
      .max(10 * 1024 * 1024),
    response.data,
  )
}
