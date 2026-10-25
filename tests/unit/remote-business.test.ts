import { describe, expect, it } from 'vitest'
import { RemoteBusinessAdapter } from '../../app/data/remote-business'
import type { DataRequest, DataSource } from '../../app/data/source'
import { DataFailure, commandKey } from '../../app/data/source'

describe('RemoteBusinessAdapter', () => {
  it('protects unaccepted workflows behind CONTRACT_REQUIRED rather than silent fallback', async () => {
    const source: DataSource = {
      mode: 'remote',
      async send() {
        return { status: 200, data: null }
      },
    }
    const adapter = new RemoteBusinessAdapter(source, () => {}, [])

    await expect(adapter.snapshot('BF-001')).rejects.toMatchObject({
      status: 501,
      code: 'CONTRACT_REQUIRED',
    })

    await expect(
      adapter.execute('BF-001', 'start', { reason: 'Test' }, commandKey()),
    ).rejects.toMatchObject({
      status: 501,
      code: 'CONTRACT_REQUIRED',
    })
  })

  it('dispatches HTTP calls with Idempotency-Key and If-Match when contract is accepted', async () => {
    const calls: DataRequest[] = []
    const source: DataSource = {
      mode: 'remote',
      async send(r) {
        calls.push(r)
        if (r.path.includes('/snapshot')) {
          return {
            status: 200,
            data: { items: [], references: [], note: 'Live data' },
          }
        }
        return {
          status: 200,
          data: {
            id: 'rec-1',
            status: 'COMPLETED',
            version: 2,
            title: 'Test',
            createdAt: '2026-10-25T00:00:00Z',
            details: {},
            history: [],
          },
        }
      },
    }
    const adapter = new RemoteBusinessAdapter(source, () => {}, ['BF-001', 'BF-002'])

    const snap = await adapter.snapshot('BF-001')
    expect(snap.note).toBe('Live data')
    expect(calls[0]!.path).toBe('/workflows/BF-001/snapshot')

    const key = commandKey()
    const record = await adapter.execute('BF-001', 'action-1', { recordId: 'rec-1' }, key, {
      'rec-1': 1,
    })
    expect(record.id).toBe('rec-1')
    expect(calls[1]!.path).toBe('/workflows/BF-001/actions/action-1')
    expect(calls[1]!.idempotencyKey).toBe(key)
    expect(calls[1]!.ifMatch).toBe('"1"')
  })

  it('enables the shared workflow contract in remote mode and rejects malformed responses', async () => {
    const source: DataSource = {
      mode: 'remote',
      async send() {
        return { status: 200, data: { items: [], references: [] } }
      },
    }
    await expect(new RemoteBusinessAdapter(source).snapshot('BF-001')).rejects.toMatchObject({
      code: 'CONTRACT_MISMATCH',
    })
  })

  it('uses the shared signed attachment protocol without forwarding API credentials', async () => {
    const calls: DataRequest[] = []
    const uploads: { url: string; init?: RequestInit }[] = []
    const record = {
      id: 'request-1',
      status: 'DRAFT',
      version: 2,
      title: 'Monitor',
      createdAt: '2026-10-25T00:00:00.000Z',
      details: {},
      history: [],
    }
    const source: DataSource = {
      mode: 'remote',
      async send(request) {
        calls.push(request)
        if (request.path.endsWith('/presign'))
          return {
            status: 200,
            data: {
              attachmentId: 'attachment-1',
              uploadUrl: 'https://files.example.test/upload/one',
              requiredHeaders: { 'x-upload-token': 'signed' },
            },
          }
        return { status: 200, data: record }
      },
    }
    const adapter = new RemoteBusinessAdapter(source, () => {}, undefined, {
      allowedFileOrigins: ['https://files.example.test'],
      fetcher: (async (url, init) => {
        uploads.push({ url: String(url), init })
        return new Response(null, { status: 200 })
      }) as typeof fetch,
    })

    await expect(
      adapter.upload(
        'request',
        'request-1',
        new File(['private evidence'], 'evidence.pdf', { type: 'application/pdf' }),
      ),
    ).resolves.toMatchObject({ id: 'request-1', version: 2 })
    expect(calls.map((call) => call.path)).toEqual([
      '/requests/request-1/attachments/presign',
      '/requests/request-1/attachments/attachment-1/complete',
    ])
    expect(calls[0]!.body?.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(uploads[0]!.init?.credentials).toBe('omit')
    expect(new Headers(uploads[0]!.init?.headers).has('authorization')).toBe(false)
  })

  it('enforces operator contract requirement on operational workflows BF-031 to BF-039', async () => {
    const source: DataSource = {
      mode: 'remote',
      async send() {
        return { status: 200, data: null }
      },
    }
    const adapter = new RemoteBusinessAdapter(source, () => {}, ['BF-031'])
    await expect(adapter.execute('BF-031', 'reindex', {}, commandKey())).rejects.toMatchObject({
      status: 403,
      code: 'OPERATOR_CONTRACT_REQUIRED',
    })
  })
})
