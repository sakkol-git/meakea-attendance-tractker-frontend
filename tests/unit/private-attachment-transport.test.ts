import { expect, it } from 'vitest'
import { RemoteDataSource } from '../../app/data/remote'

it('uploads and downloads private attachment bytes through authenticated transport without redirects', async () => {
  const source = new RemoteDataSource(
    'https://hr.test/prefix/api/v1',
    () => 'current-access',
    (async (url, init) => {
      expect(String(url)).toMatch(
        /^https:\/\/hr.test\/prefix\/api\/v1\/requests\/request-a\/attachments\/file-a\/(upload|file)$/,
      )
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer current-access')
      expect(init?.redirect).toBe('error')
      expect(init?.cache).toBe('no-store')
      if (init?.method === 'PUT') {
        expect(new Headers(init.headers).get('Content-Type')).toBe('application/pdf')
        expect(new Uint8Array(init.body as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 255]))
        return new Response(null, { status: 200 })
      }
      return new Response(new Uint8Array([1, 2, 255]), {
        headers: { 'Content-Type': 'application/pdf' },
      })
    }) as typeof fetch,
  )
  await source.send({
    method: 'PUT',
    path: '/requests/request-a/attachments/file-a/upload',
    bytes: new Uint8Array([1, 2, 255]),
    contentType: 'application/pdf',
  })
  const result = await source.send({
    method: 'GET',
    path: '/requests/request-a/attachments/file-a/file',
    responseType: 'bytes',
  })
  expect(result.data).toEqual([1, 2, 255])
})
it.each([
  '/auth/profile',
  '//foreign.test/file',
  '/requests/request-a/attachments/file-a/download',
])('rejects binary transfer outside exact private paths: %s', async (path) => {
  let sent = false
  const source = new RemoteDataSource('https://hr.test/api/v1', () => 'access', (async () => {
    sent = true
    return new Response()
  }) as typeof fetch)
  await expect(source.send({ method: 'GET', path, responseType: 'bytes' })).rejects.toMatchObject({
    code: 'INVALID_PATH',
  })
  expect(sent).toBe(false)
})
it('rejects non-file MIME and preserves authorization problems', async () => {
  for (const [status, type] of [
    [200, 'text/html'],
    [403, 'application/problem+json'],
  ] as const) {
    const source = new RemoteDataSource(
      'https://hr.test/api/v1',
      () => 'access',
      (async () =>
        new Response(JSON.stringify({ code: 'FORBIDDEN', detail: 'Private file denied' }), {
          status,
          headers: { 'content-type': type },
        })) as typeof fetch,
    )
    await expect(
      source.send({
        method: 'GET',
        path: '/requests/request-a/attachments/file-a/file',
        responseType: 'bytes',
      }),
    ).rejects.toMatchObject({ code: status === 403 ? 'FORBIDDEN' : 'INVALID_RESPONSE' })
  }
})
