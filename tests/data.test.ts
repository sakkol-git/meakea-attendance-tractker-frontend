import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LocalDataSource } from '../app/data/local.ts'
import { RemoteDataSource } from '../app/data/remote.ts'
import { ClientData } from '../app/data/client.ts'
import { commandKey, DataFailure } from '../app/data/source.ts'
import type { RecordData } from '../app/data/source.ts'

const failure = (status: number, code: string) => (error: unknown) =>
  error instanceof DataFailure && error.status === status && error.code === code

test('local command replay, conflicting payload, role gate, stale version and notifications', async () => {
  const source = new LocalDataSource()
  const command = {
    method: 'POST' as const,
    path: '/leave/requests',
    body: { reason: 'Family appointment' },
    idempotencyKey: commandKey(),
  }
  const created = await source.send(command)
  assert.equal(created.status, 201)
  assert.deepEqual(await source.send(command), created)
  await assert.rejects(
    source.send({ ...command, body: { reason: 'Changed' } }),
    failure(409, 'IDEMPOTENCY_CONFLICT'),
  )
  const id = (created.data as RecordData).id
  const decision = {
    method: 'POST' as const,
    path: `/leave/requests/${id}/approve`,
    ifMatch: created.etag,
    idempotencyKey: commandKey(),
  }
  await assert.rejects(source.send(decision), failure(403, 'FORBIDDEN'))
  source.setDemoRole('MANAGER')
  await assert.rejects(
    source.send({ ...decision, ifMatch: undefined }),
    failure(428, 'VERSION_REQUIRED'),
  )
  const approved = await source.send(decision)
  assert.equal((approved.data as RecordData).status, 'APPROVED')
  assert.equal(approved.etag, '"2"')
  await assert.rejects(
    source.send({ ...decision, idempotencyKey: commandKey() }),
    failure(412, 'STALE_VERSION'),
  )
  await assert.rejects(
    source.send({ ...decision, ifMatch: approved.etag, idempotencyKey: commandKey() }),
    failure(409, 'INVALID_TRANSITION'),
  )
  const inbox = await source.send({ method: 'GET', path: '/notifications' })
  assert.equal((inbox.data as RecordData).total, 1)
  ;(approved.data as RecordData).status = 'TAMPERED'
  const read = await source.send({ method: 'GET', path: `/leave/requests/${id}` })
  assert.equal((read.data as RecordData).status, 'APPROVED')
})

test('attendance is stateful, replay safe and uses the demo company date', async () => {
  const source = new LocalDataSource(() => new Date('2026-10-23T20:00:00Z'))
  const command = {
    method: 'POST' as const,
    path: '/attendance/check-in',
    idempotencyKey: commandKey(),
  }
  const started = await source.send(command)
  assert.deepEqual(await source.send(command), started)
  await assert.rejects(
    source.send({ ...command, idempotencyKey: commandKey() }),
    failure(409, 'SESSION_ALREADY_OPEN'),
  )
  const today = (await source.send({ method: 'GET', path: '/attendance/today' })).data as RecordData
  assert.equal(today.date, '2026-10-24')
  assert.equal((today.sessions as unknown[]).length, 1)
  const ended = await source.send({
    method: 'POST',
    path: '/attendance/check-out',
    idempotencyKey: commandKey(),
    ifMatch: started.etag,
  })
  assert.ok((ended.data as RecordData).clockOut)
  source.reset()
  assert.equal(
    ((await source.send({ method: 'GET', path: '/attendance/me' })).data as RecordData).total,
    0,
  )
})

test('general requests progress through draft, submission, approval and fulfillment', async () => {
  const source = new LocalDataSource()
  let result = await source.send({
    method: 'POST',
    path: '/requests',
    body: { title: 'Monitor' },
    idempotencyKey: commandKey(),
  })
  const id = (result.data as RecordData).id
  for (const [action, role, expected] of [
    ['submit', 'EMPLOYEE', 'PENDING'],
    ['approve', 'MANAGER', 'APPROVED'],
    ['fulfill', 'HR_ADMIN', 'FULFILLED'],
  ] as const) {
    source.setDemoRole(role)
    result = await source.send({
      method: 'POST',
      path: `/requests/${id}/${action}`,
      ifMatch: result.etag,
      idempotencyKey: commandKey(),
    })
    assert.equal((result.data as RecordData).status, expected)
  }
})

test('mode is explicit; instances isolated; unsupported operations fail rather than fake success', async () => {
  assert.equal(new ClientData().source.mode, 'local')
  assert.throws(() => new ClientData('typo'), failure(0, 'INVALID_MODE'))
  assert.throws(() => new ClientData('remote'), failure(0, 'INVALID_BASE_URL'))
  const source = new LocalDataSource()
  await assert.rejects(
    source.send({ method: 'POST', path: '/requests', body: { title: 'A' } }),
    failure(428, 'IDEMPOTENCY_REQUIRED'),
  )
  await assert.rejects(
    source.send({ method: 'GET', path: '/reports/dashboard' }),
    failure(501, 'DEMO_NOT_IMPLEMENTED'),
  )
  await assert.rejects(
    source.send({ method: 'GET', path: '/requests/me', query: { status: 'PENDING' } }),
    failure(501, 'DEMO_NOT_IMPLEMENTED'),
  )
  assert.equal(
    ((await new LocalDataSource().send({ method: 'GET', path: '/requests/me' })).data as RecordData)
      .total,
    0,
  )
})

test('remote preserves wire headers, URL encoding, etag, empty bodies, and current bearer', async () => {
  let token = 'test-token'
  let count = 0
  const key = commandKey()
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/api/v1/requests')
    assert.equal(url.searchParams.get('search'), 'a & b')
    const headers = new Headers(init?.headers)
    assert.equal(headers.get('authorization'), `Bearer ${token}`)
    assert.equal(headers.get('idempotency-key'), key)
    assert.equal(headers.get('if-match'), '"3"')
    assert.equal(init?.redirect, 'error')
    count++
    return count === 1
      ? new Response('{"id":"r1"}', { status: 201, headers: { etag: '"4"' } })
      : new Response(null, { status: 204 })
  }
  const source = new RemoteDataSource('https://example.test/api/v1/', () => token, fetcher)
  const request = {
    method: 'POST' as const,
    path: '/requests',
    query: { search: 'a & b' },
    body: { title: 'Monitor' },
    idempotencyKey: key,
    ifMatch: '"3"',
  }
  assert.equal((await source.send(request)).etag, '"4"')
  token = 'rotated-test-token'
  assert.equal((await source.send(request)).data, null)
})

test('remote problem and transport errors never return local success or retry mutations', async () => {
  let calls = 0
  const source = new RemoteDataSource(
    'https://example.test/api/v1',
    () => undefined,
    async () => {
      calls++
      return new Response('{"code":"STALE_VERSION","detail":"Refresh","traceId":"trace-test"}', {
        status: 412,
      })
    },
  )
  await assert.rejects(source.send({ method: 'GET', path: '/requests/me' }), (error) => {
    assert.ok(failure(412, 'STALE_VERSION')(error))
    assert.equal((error as DataFailure).traceId, 'trace-test')
    return true
  })
  assert.equal(calls, 1)
  const bad = new RemoteDataSource(
    'https://example.test/api/v1',
    () => undefined,
    async () => new Response('<html>bad</html>'),
  )
  await assert.rejects(
    bad.send({ method: 'GET', path: '/auth/me' }),
    failure(200, 'INVALID_RESPONSE'),
  )
  const offline = new RemoteDataSource(
    'https://example.test/api/v1',
    () => undefined,
    async () => {
      throw new TypeError('offline')
    },
  )
  await assert.rejects(
    offline.send({ method: 'GET', path: '/auth/me' }),
    failure(0, 'NETWORK_ERROR'),
  )
  assert.throws(
    () => new RemoteDataSource('https://example.test/api/v1?token=secret', () => undefined),
    failure(0, 'INVALID_BASE_URL'),
  )
  assert.throws(
    () => new RemoteDataSource('http://example.test/api/v1', () => undefined),
    failure(0, 'INVALID_BASE_URL'),
  )
})

test('leave cancellation and correction rejection retain terminal guards', async () => {
  for (const [path, action, role, status] of [
    ['/leave/requests', 'cancel', 'EMPLOYEE', 'CANCELLED'],
    ['/attendance/corrections', 'reject', 'MANAGER', 'REJECTED'],
  ] as const) {
    const source = new LocalDataSource()
    const record = await source.send({
      method: 'POST',
      path,
      body: { reason: 'Demo' },
      idempotencyKey: commandKey(),
    })
    source.setDemoRole(role)
    const decided = await source.send({
      method: 'POST',
      path: `${path}/${(record.data as RecordData).id}/${action}`,
      ifMatch: record.etag,
      idempotencyKey: commandKey(),
    })
    assert.equal((decided.data as RecordData).status, status)
    await assert.rejects(
      source.send({
        method: 'POST',
        path: `${path}/${(record.data as RecordData).id}/constructor`,
        ifMatch: decided.etag,
        idempotencyKey: commandKey(),
      }),
      failure(501, 'DEMO_NOT_IMPLEMENTED'),
    )
  }
})

test('remote timeout reports unknown outcome without replay', async () => {
  const fetcher: typeof fetch = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    })
  const source = new RemoteDataSource('https://example.test/api/v1', () => undefined, fetcher, 5)
  await assert.rejects(
    source.send({
      method: 'POST',
      path: '/requests',
      body: { title: 'Monitor' },
      idempotencyKey: commandKey(),
    }),
    failure(0, 'TIMEOUT'),
  )
})
