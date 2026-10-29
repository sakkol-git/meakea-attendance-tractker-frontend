import { expect, it } from 'vitest'
import { WorkspaceApi } from '../../app/api/workspace'
import type { DataRequest, DataSource } from '../../app/data/source'

it('renders a newly persisted zero-version attendance session and preserves an opaque checkout validator', async () => {
  const requests: DataRequest[] = []
  const source: DataSource = {
    mode: 'remote',
    async send(request) {
      requests.push(request)
      return {
        status: 200,
        data: {
          date: '2026-10-29',
          sessions: [
            {
              id: 'session-a',
              clockIn: '2026-10-29T01:00:00Z',
              clockOut: null,
              version: 0,
              etag: '"opaque-session-a"',
            },
          ],
        },
      }
    },
  }
  const api = new WorkspaceApi(source)
  const today = await api.today()
  expect(today.sessions[0]!.version).toBe(0)
  await api.clock(today.sessions[0])
  expect(requests.at(-1)!.ifMatch).toBe('"opaque-session-a"')
})
