import { expect, it } from 'vitest'
import { RemoteDataSource } from '../../app/data/remote'
import { commandKey } from '../../app/data/source'
it('calls browser fetch with the global receiver and forwards CSRF only on mutations', async () => {
  const headers: Headers[] = []
  const fetcher = function (this: unknown, _url: unknown, init?: RequestInit) {
    expect(this).toBe(globalThis)
    headers.push(new Headers(init?.headers))
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
  } as typeof fetch
  const source = new RemoteDataSource(
    'https://hr.example.test/api/v1',
    () => 'access',
    fetcher,
    1000,
    () => 'csrf-value',
  )
  await source.send({ method: 'GET', path: '/auth/me' })
  await source.send({
    method: 'POST',
    path: '/requests',
    body: { title: 'Example' },
    idempotencyKey: commandKey(),
  })
  expect(headers[0]!.has('X-XSRF-TOKEN')).toBe(false)
  expect(headers[1]!.get('X-XSRF-TOKEN')).toBe('csrf-value')
  expect(headers[1]!.get('Authorization')).toBe('Bearer access')
})

import { authenticatedSource } from '../../app/data/authenticated'
import { DataFailure } from '../../app/data/source'
import type { DataRequest, DataSource } from '../../app/data/source'
it('does not sign out a valid session on a service outage after refresh, and keeps the original command', async () => {
  const requests: DataRequest[] = []
  let refreshes = 0
  let expired = false
  const source: DataSource = {
    mode: 'remote',
    async send(r) {
      requests.push(r)
      throw new DataFailure(requests.length === 1 ? 401 : 503, 'TEST', 'Service unavailable')
    },
  }
  const api = authenticatedSource(
    source,
    async () => {
      refreshes++
    },
    () => {
      expired = true
    },
  )
  await expect(
    api.send({
      method: 'POST',
      path: '/requests',
      body: { title: 'Example' },
      idempotencyKey: commandKey(),
    }),
  ).rejects.toMatchObject({ status: 503 })
  expect(expired).toBe(false)
  expect(refreshes).toBe(1)
  expect(requests[0]).toBe(requests[1])
})
it('expires after refresh denial but preserves the session during refresh transport failure', async () => {
  const source: DataSource = {
    mode: 'remote',
    async send() {
      throw new DataFailure(401, 'EXPIRED', 'Expired')
    },
  }
  for (const status of [0, 503, 401, 403]) {
    let expired = false
    const api = authenticatedSource(
      source,
      async () => {
        throw new DataFailure(status, 'TEST', 'Failed refresh')
      },
      () => {
        expired = true
      },
    )
    await expect(api.send({ method: 'GET', path: '/requests/me' })).rejects.toMatchObject({
      status,
    })
    expect(expired).toBe([401, 403].includes(status))
  }
})
