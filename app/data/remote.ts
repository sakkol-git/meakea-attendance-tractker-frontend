import { DataFailure, validateRequest } from './source.ts'
import type { DataRequest, DataResponse, DataSource, RecordData } from './source.ts'

export class RemoteDataSource implements DataSource {
  readonly mode = 'remote' as const
  private readonly base: URL
  private readonly token: () => string | undefined
  private readonly fetcher: typeof fetch
  private readonly timeoutMs: number
  private readonly csrf: () => string | undefined
  constructor(
    baseUrl: string,
    token: () => string | undefined,
    fetcher: typeof fetch = globalThis.fetch,
    timeoutMs = 15000,
    csrf: () => string | undefined = () => undefined,
  ) {
    this.token = token
    this.fetcher = fetcher.bind(globalThis)
    this.timeoutMs = timeoutMs
    this.csrf = csrf
    try {
      this.base = new URL(baseUrl)
    } catch {
      throw new DataFailure(0, 'INVALID_BASE_URL', 'Provide an absolute API URL ending in /api/v1.')
    }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(this.base.hostname)
    if (
      (this.base.protocol !== 'https:' && !(local && this.base.protocol === 'http:')) ||
      this.base.username ||
      this.base.password ||
      this.base.search ||
      this.base.hash ||
      !this.base.pathname.replace(/\/$/, '').endsWith('/api/v1')
    ) {
      throw new DataFailure(
        0,
        'INVALID_BASE_URL',
        'Use HTTPS with /api/v1, no credentials, query or fragment; HTTP is allowed for loopback development.',
      )
    }
  }
  async send(request: DataRequest): Promise<DataResponse> {
    validateRequest(request)
    const url = new URL(this.base.toString())
    url.pathname = url.pathname.replace(/\/$/, '') + request.path
    for (const [key, value] of Object.entries(request.query ?? {})) url.searchParams.set(key, value)
    const headers: Record<string, string> = { Accept: 'application/json, application/problem+json' }
    const token = this.token()
    if (token) headers.Authorization = `Bearer ${token}`
    const csrf = this.csrf()
    if (request.method !== 'GET' && csrf) headers['X-XSRF-TOKEN'] = csrf
    if (request.body !== undefined) headers['Content-Type'] = 'application/json'
    if (request.idempotencyKey) headers['Idempotency-Key'] = request.idempotencyKey
    if (request.ifMatch) headers['If-Match'] = request.ifMatch
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetcher(url, {
        method: request.method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: controller.signal,
        credentials: 'include',
        redirect: 'error',
        cache: 'no-store',
      })
      const text = response.status === 204 ? '' : await response.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        throw new DataFailure(
          response.status,
          'INVALID_RESPONSE',
          'The API returned an invalid JSON response.',
        )
      }
      if (!response.ok) {
        const problem = data as RecordData | null
        throw new DataFailure(
          response.status,
          typeof problem?.code === 'string' ? problem.code : `HTTP_${response.status}`,
          typeof problem?.detail === 'string' ? problem.detail : 'The API request failed.',
          typeof problem?.traceId === 'string' ? problem.traceId : undefined,
        )
      }
      return { status: response.status, data, etag: response.headers.get('etag') ?? undefined }
    } catch (error) {
      if (error instanceof DataFailure) throw error
      throw new DataFailure(
        0,
        controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        'The request could not be completed. Its outcome may be unknown; retry commands with the same key.',
      )
    } finally {
      clearTimeout(timer)
    }
  }
}
