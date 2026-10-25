import { describe, expect, it } from 'vitest'
import { approvalAgeDays, approvalExceptions, applyListQuery } from '../../app/utils/approval'

const records = [
  {
    id: 'newer',
    status: 'PENDING',
    type: 'Leave',
    employeeName: 'Sok Dara',
    createdAt: '2026-10-24T03:00:00Z',
  },
  {
    id: 'older',
    status: 'PENDING',
    type: 'Equipment',
    employeeName: 'Chan Sopheak',
    createdAt: '2026-10-20T03:00:00Z',
    policyExceptions: ['Low team coverage'],
  },
  {
    id: 'closed',
    status: 'APPROVED',
    type: 'Leave',
    employeeName: 'Sok Dara',
    createdAt: '2026-10-18T03:00:00Z',
  },
]

describe('approval queue rules shared with mobile', () => {
  it('filters before paging and sorts oldest first', () => {
    const result = applyListQuery(records, {
      status: 'PENDING',
      search: 'a',
      minAgeDays: 2,
      sort: 'oldest',
      page: 0,
      size: 1,
      now: new Date('2026-10-25T03:00:00Z'),
    })
    expect(result.total).toBe(1)
    expect(result.items.map((row) => row.id)).toEqual(['older'])
  })

  it('derives waiting age and preserves server policy exception text', () => {
    expect(approvalAgeDays(records[1]!, new Date('2026-10-25T03:00:00Z'))).toBe(5)
    expect(approvalExceptions(records[1]!)).toEqual(['Low team coverage'])
    expect(approvalExceptions({ ...records[1]!, policyExceptions: 'invalid' })).toEqual([])
  })
})
