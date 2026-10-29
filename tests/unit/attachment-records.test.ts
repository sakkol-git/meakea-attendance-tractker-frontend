import { expect, it } from 'vitest'
import {
  attachmentItems,
  privateAttachmentBytes,
} from '../../app/features/requests/data/attachment-records'
import type { DataRequest, DataSource } from '../../app/data/source'
it('reads persisted metadata from request detail and obtains bytes only through its exact private ticket', async () => {
  const calls: DataRequest[] = []
  const source: DataSource = {
    mode: 'remote',
    async send(r) {
      calls.push(r)
      if (r.path.endsWith('/download'))
        return {
          status: 200,
          data: { downloadUrl: '/api/v1/requests/request-a/attachments/file-a/file' },
        }
      if (r.responseType === 'bytes') return { status: 200, data: [1, 2, 3] }
      return {
        status: 200,
        data: {
          id: 'request-a',
          attachments: [
            {
              id: 'file-a',
              fileName: 'proof.pdf',
              fileSize: 3,
              contentType: 'application/pdf',
              status: 'FINALIZED',
              createdAt: '2026-10-29T00:00:00Z',
            },
          ],
        },
      }
    },
  }
  expect((await attachmentItems(source, 'request', 'request-a'))[0]!.name).toBe('proof.pdf')
  expect(await privateAttachmentBytes(source, 'request', 'request-a', 'file-a')).toEqual([1, 2, 3])
  expect(calls.at(-1)!.responseType).toBe('bytes')
})
it('rejects cross-request download ticket before reading any bytes', async () => {
  let calls = 0
  const source: DataSource = {
    mode: 'remote',
    async send() {
      calls++
      return {
        status: 200,
        data: { downloadUrl: '/api/v1/requests/foreign/attachments/file-a/file' },
      }
    },
  }
  await expect(
    privateAttachmentBytes(source, 'request', 'request-a', 'file-a'),
  ).rejects.toMatchObject({ code: 'INVALID_FILE_URL' })
  expect(calls).toBe(1)
})
