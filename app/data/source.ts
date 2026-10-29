export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type RecordData = { [key: string]: Json }
export interface DataRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Relative domain path, without /api/v1. Query values are encoded separately. */
  path: string
  query?: Record<string, string>
  body?: RecordData
  idempotencyKey?: string
  ifMatch?: string
  bytes?: Uint8Array
  contentType?: string
  /** Private report downloads use the authenticated API transport. */
  responseType?: 'csv' | 'bytes'
}
export interface DataResponse {
  status: number
  data: Json
  etag?: string
}
export interface DataSource {
  readonly mode: 'local' | 'remote'
  send(request: DataRequest): Promise<DataResponse>
}
export class DataFailure extends Error {
  readonly status: number
  readonly code: string
  readonly traceId?: string
  constructor(status: number, code: string, message: string, traceId?: string) {
    super(message)
    this.status = status
    this.code = code
    this.traceId = traceId
  }
}
export function validateRequest(request: DataRequest) {
  const privateFile = /^\/requests\/[a-z0-9-]+\/attachments\/[a-z0-9-]+\/(file|upload)$/
  if (request.bytes !== undefined || request.contentType !== undefined) {
    if (
      request.method !== 'PUT' ||
      !privateFile.test(request.path) ||
      !request.path.endsWith('/upload') ||
      !request.bytes?.length ||
      request.bytes.length > 10 * 1024 * 1024 ||
      request.body !== undefined ||
      !['application/pdf', 'image/png', 'image/jpeg'].includes(request.contentType ?? '')
    )
      throw new DataFailure(0, 'INVALID_PATH', 'Use a bounded private attachment upload.')
  }
  if (
    request.responseType &&
    (request.method !== 'GET' ||
      (request.responseType === 'bytes'
        ? !privateFile.test(request.path) || !request.path.endsWith('/file')
        : !/^\/reports\/exports\/[a-z0-9-]+\/download$/.test(request.path)))
  )
    throw new DataFailure(0, 'INVALID_PATH', 'CSV downloads require a private export path.')
  if (
    !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) ||
    !/^\/[a-z0-9/-]+$/.test(request.path) ||
    request.path.includes('//')
  ) {
    throw new DataFailure(
      0,
      'INVALID_PATH',
      'Use a relative domain path without a query or origin.',
    )
  }
  if (
    request.method === 'POST' &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      request.idempotencyKey ?? '',
    )
  ) {
    throw new DataFailure(
      428,
      'IDEMPOTENCY_REQUIRED',
      'Provide a UUID v4 command key and preserve it when retrying.',
    )
  }
}
export function commandKey(): string {
  return globalThis.crypto.randomUUID()
}
