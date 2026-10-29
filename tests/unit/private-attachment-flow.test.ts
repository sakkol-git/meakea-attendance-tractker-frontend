import { expect, it } from 'vitest'
import { RemoteBusinessAdapter } from '../../app/data/remote-business'
import { DataFailure } from '../../app/data/source'
import type { DataRequest, DataSource } from '../../app/data/source'

it('private upload uses authenticated source, returns the persisted attachment, and retains command keys after uncertain completion', async () => {
  const calls: DataRequest[] = []
  let failed = false
  const source: DataSource = {
    mode: 'remote',
    async send(r) {
      calls.push(r)
      if (r.path.endsWith('/presign'))
        return {
          status: 200,
          data: {
            attachmentId: 'file-a',
            uploadUrl: '/api/v1/requests/request-a/attachments/file-a/upload',
          },
        }
      if (r.method === 'PUT') return { status: 200, data: null }
      if (!failed) {
        failed = true
        throw new DataFailure(0, 'TIMEOUT', 'Unknown outcome')
      }
      return {
        status: 200,
        data: {
          id: 'file-a',
          version: 1,
          status: 'FINALIZED',
          title: 'proof.pdf',
          createdAt: '2026-10-29T00:00:00Z',
          details: {},
          history: [],
        },
      }
    },
  }
  const adapter = new RemoteBusinessAdapter(source)
  const file = new File(['%PDF-proof'], 'proof.pdf', { type: 'application/pdf' })
  await expect(adapter.upload('request', 'request-a', file)).rejects.toMatchObject({
    code: 'TIMEOUT',
  })
  expect((await adapter.upload('request', 'request-a', file)).id).toBe('file-a')
  expect(calls[0]!.idempotencyKey).toBe(calls[3]!.idempotencyKey)
  expect(calls[2]!.idempotencyKey).toBe(calls[5]!.idempotencyKey)
  expect(calls[1]!.bytes).toBeInstanceOf(Uint8Array)
})
it('rejects a private upload ticket for another request before transferring bytes', async () => {
  const calls: DataRequest[] = []
  const source: DataSource = {
    mode: 'remote',
    async send(r) {
      calls.push(r)
      return {
        status: 200,
        data: {
          attachmentId: 'file-a',
          uploadUrl: '/api/v1/requests/foreign/attachments/file-a/upload',
        },
      }
    },
  }
  await expect(
    new RemoteBusinessAdapter(source).upload(
      'request',
      'request-a',
      new File(['%PDF'], 'proof.pdf', { type: 'application/pdf' }),
    ),
  ).rejects.toMatchObject({ code: 'INVALID_FILE_URL' })
  expect(calls).toHaveLength(1)
})
