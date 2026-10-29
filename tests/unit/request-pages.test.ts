import { expect, it } from 'vitest'
import { WorkspaceApi } from '../../app/api/workspace'
import type { DataRequest, DataSource } from '../../app/data/source'

it('selects explicit server pages for remote own requests and reviewer inboxes', async () => {
  const calls: DataRequest[] = []
  const source: DataSource = {
    mode: 'remote',
    async send(request) {
      calls.push(request)
      return {
        status: 200,
        data: { items: [], total: 0, page: Number(request.query?.page ?? 0), size: 25 },
      }
    },
  }
  const api = new WorkspaceApi(source)
  await api.list('myRequests')
  await api.list('pendingRequests')
  await api.list('myRequests', { page: 2, size: 25 })
  expect(calls.map(({ path, query }) => ({ path, query }))).toEqual([
    { path: '/requests/me', query: { page: '0', size: '25' } },
    { path: '/requests/inbox', query: { page: '0', size: '25' } },
    { path: '/requests/me', query: { page: '2', size: '25' } },
  ])
})
