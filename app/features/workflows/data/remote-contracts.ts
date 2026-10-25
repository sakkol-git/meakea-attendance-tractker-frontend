import { z } from 'zod'
import { DataFailure } from '../../../data/source'

export const RemoteWorkflowRecord = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  version: z.number().int().positive(),
  title: z.string(),
  createdAt: z.string().datetime(),
  details: z.record(z.string(), z.unknown()),
  history: z.array(z.object({ at: z.string().datetime(), action: z.string(), actor: z.string() })),
})

export const RemoteWorkflowSnapshot = z.object({
  items: z.array(RemoteWorkflowRecord),
  references: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      version: z.number().int().positive().optional(),
      kind: z.string().optional(),
    }),
  ),
  note: z.string(),
})

export const SignedUpload = z.object({
  attachmentId: z.string().min(1),
  uploadUrl: z.string().url(),
  requiredHeaders: z.record(z.string(), z.string()).optional(),
})

export const SignedDownload = z.object({ downloadUrl: z.string().url() })

export function decodeRemote<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value)
  if (!parsed.success)
    throw new DataFailure(
      0,
      'CONTRACT_MISMATCH',
      'The server response does not match the accepted workflow contract.',
    )
  return parsed.data
}

export function signedUrl(value: string, allowedOrigins: ReadonlySet<string>): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new DataFailure(0, 'INVALID_FILE_URL', 'The server returned an invalid signed file URL.')
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (allowedOrigins.size > 0 && !allowedOrigins.has(url.origin))
  )
    throw new DataFailure(
      0,
      'INVALID_FILE_URL',
      'The signed file URL is outside the configured storage origins.',
    )
  return url.href
}

export function uploadHeaders(required: Record<string, string> = {}, contentType: string) {
  const headers: Record<string, string> = { 'Content-Type': contentType }
  for (const [name, value] of Object.entries(required)) {
    if (['authorization', 'cookie', 'host'].includes(name.toLowerCase()))
      throw new DataFailure(
        0,
        'CONTRACT_MISMATCH',
        'The signed upload requested a forbidden credential header.',
      )
    headers[name] = value
  }
  return headers
}
