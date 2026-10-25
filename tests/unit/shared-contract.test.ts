import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { WorkspaceApi } from '../../app/api/workspace'
import { DataFailure, type DataRequest, type DataSource } from '../../app/data/source'

const fixture = JSON.parse(
  readFileSync(new URL('../../contracts/fixtures/leave-approval.json', import.meta.url), 'utf8'),
)
function setup(failOnce = false, version = fixture.before.version) {
  const requests: DataRequest[] = []
  let failed = false
  const source: DataSource = {
    mode: 'remote',
    async send(request) {
      requests.push(request)
      if (request.method === 'GET')
        return { status: 200, data: { ...fixture.before, version }, etag: fixture.etag }
      if (failOnce && !failed) {
        failed = true
        throw new DataFailure(0, 'NETWORK', 'Outcome unknown')
      }
      return { status: 200, data: fixture.after, etag: fixture.nextEtag }
    },
  }
  return { requests, api: new WorkspaceApi(source) }
}
it('reads the shared leave fixture through the actual web adapter', async () => {
  const { api, requests } = setup()
  const result = await api.detail('leaves', fixture.id)
  expect(result.row).toMatchObject(fixture.before)
  expect(result.etag).toBe(fixture.etag)
  expect(requests[0]).toMatchObject({ method: 'GET', path: `/leave/requests/${fixture.id}` })
})
it('approves with the shared route and preserves the opaque concurrency token', async () => {
  const { api, requests } = setup()
  const result = await api.change('leaves', fixture.id, 'approve', fixture.before.version)
  expect(result.data).toEqual(fixture.after)
  const request = requests.find((r) => r.method === 'POST')!
  expect(request.path).toBe(`/leave/requests/${fixture.id}/approve`)
  expect(request.ifMatch).toBe(fixture.etag)
  expect(request.body ?? null).toEqual(fixture.webBody)
  expect(request.idempotencyKey).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )
})
it('retains the command key after an unknown outcome', async () => {
  const { api, requests } = setup(true)
  await expect(
    api.change('leaves', fixture.id, 'approve', fixture.before.version),
  ).rejects.toMatchObject({
    code: 'NETWORK',
  })
  await api.change('leaves', fixture.id, 'approve', fixture.before.version)
  const commands = requests.filter((r) => r.method === 'POST')
  expect(commands).toHaveLength(2)
  expect(commands[0]!.idempotencyKey).toBe(commands[1]!.idempotencyKey)
  expect(commands[0]!.ifMatch).toBe(commands[1]!.ifMatch)
})
it('does not send an approval when the detail version has changed', async () => {
  const { api, requests } = setup(false, fixture.after.version)
  await expect(
    api.change('leaves', fixture.id, 'approve', fixture.before.version),
  ).rejects.toMatchObject({
    status: 412,
  })
  expect(requests.every((r) => r.method === 'GET')).toBe(true)
})
