import { expect, it } from 'vitest'
import { ClientData } from '../../app/data/client'
import { SessionService } from '../../app/api/auth'
import type { DataSource } from '../../app/data/source'
it('shares refresh requests and prevents an in-flight refresh reviving a signed-out session', async () => {
  let resolve!: (value: { status: number; data: { accessToken: string } }) => void
  let refreshes = 0
  const client = new ClientData('local', '')
  let tokenWrites = 0
  client.setAccessToken = () => {
    tokenWrites++
  }
  const source: DataSource = {
    mode: 'remote',
    async send(r) {
      if (r.path === '/auth/refresh') {
        refreshes++
        return new Promise((r) => {
          resolve = r
        })
      }
      return { status: 204, data: null }
    },
  }
  const service = new SessionService(client, source)
  const first = service.refresh()
  const second = service.refresh()
  const settled = Promise.allSettled([first, second])
  expect(refreshes).toBe(1)
  await service.logout()
  resolve({ status: 200, data: { accessToken: 'late-token' } })
  expect((await settled).every((x) => x.status === 'rejected')).toBe(true)
  expect(tokenWrites).toBe(0)
})
