import { expect, it } from 'vitest'
import { WorkspaceApi } from '../../app/api/workspace'
import type { DataRequest, DataSource } from '../../app/data/source'

it('uses the canonical default quantity for remote non-material requests', async () => {
  let sent: DataRequest | undefined
  const source: DataSource = {
    mode: 'remote',
    async send(request) {
      sent = request
      return { status: 201, data: { id: 'request-a', version: 0, status: 'DRAFT' } }
    },
  }
  await new WorkspaceApi(source).create('requests', {
    title: 'Work remotely',
    type: 'REMOTE_WORK',
    reason: 'Scheduled work',
    quantity: null,
  })
  expect(sent!.body!.quantity).toBe(1)
})
