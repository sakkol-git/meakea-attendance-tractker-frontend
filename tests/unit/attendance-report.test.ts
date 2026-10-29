import { expect, it } from 'vitest'
import { WorkspaceApi } from '../../app/api/workspace'
import type { DataRequest, DataSource } from '../../app/data/source'

it('decodes actual attendance summary sessions without inventing expected attendance or leave counts', async () => {
  const requests: DataRequest[] = []
  const source: DataSource = {
    mode: 'remote',
    async send(request) {
      requests.push(request)
      return {
        status: 200,
        data: {
          from: null,
          to: null,
          totalCount: 1,
          records: [
            {
              id: 'projection',
              sessionId: 'session',
              employeeId: 'employee',
              workDate: '2026-10-28',
              status: 'OPEN',
              minutesLate: 0,
              minutesWorked: null,
              aggregateRevision: 1,
              clockIn: '2026-10-28T01:00:00Z',
              clockOut: null,
              timezone: 'Asia/Phnom_Penh',
              source: 'TAP',
            },
          ],
        },
      }
    },
  }
  const result = await new WorkspaceApi(source).attendanceReport('2026-10-01', '2026-10-28')
  expect(result.records[0]?.minutesWorked).toBeNull()
  expect(result.records[0]?.timezone).toBe('Asia/Phnom_Penh')
  expect(result).not.toHaveProperty('expected')
  expect(requests).toEqual([
    {
      method: 'GET',
      path: '/reports/attendance/summary',
      query: { from: '2026-10-01', to: '2026-10-28' },
    },
  ])
})
