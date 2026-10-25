import { describe, expect, it } from 'vitest'
import {
  decode,
  EmployeeRecord,
  DepartmentRecord,
  PositionRecord,
  WorkSiteRecord,
  LeaveRecord,
  ShiftRecord,
  HolidayRecord,
  DocumentRecord,
} from '../../app/schemas/contracts'
import { DataFailure } from '../../app/data/source'

describe('Domain typed Zod contracts', () => {
  it('validates and decodes a complete EmployeeRecord', () => {
    const raw = {
      id: 'emp-101',
      name: 'Alice Cooper',
      email: 'alice@example.com',
      department: 'Engineering',
      position: 'Staff Engineer',
      manager: 'Bob Leader',
      status: 'ACTIVE',
      version: 1,
    }
    const decoded = decode(EmployeeRecord, raw)
    expect(decoded.name).toBe('Alice Cooper')
    expect(decoded.version).toBe(1)
  })

  it('rejects invalid EmployeeRecord missing required fields', () => {
    expect(() => decode(EmployeeRecord, { id: 'emp-1' })).toThrow(DataFailure)
  })

  it('validates DepartmentRecord and PositionRecord', () => {
    const dept = decode(DepartmentRecord, {
      id: 'dep-1',
      name: 'Human Resources',
      code: 'HR',
      version: 2,
    })
    expect(dept.name).toBe('Human Resources')

    const pos = decode(PositionRecord, {
      id: 'pos-1',
      title: 'Talent Acquisition Lead',
      department: 'Human Resources',
      version: 1,
    })
    expect(pos.title).toBe('Talent Acquisition Lead')
  })

  it('validates WorkSiteRecord coordinates and radius', () => {
    const site = decode(WorkSiteRecord, {
      id: 'site-1',
      name: 'Phnom Penh HQ',
      latitude: 11.5564,
      longitude: 104.9282,
      radiusMeters: 200,
      version: 1,
    })
    expect(site.radiusMeters).toBe(200)

    expect(() =>
      decode(WorkSiteRecord, {
        id: 'site-2',
        name: 'Invalid Site',
        latitude: 'bad',
        longitude: 104.9,
        radiusMeters: -50,
        version: 1,
      }),
    ).toThrow(DataFailure)
  })

  it('validates LeaveRecord, ShiftRecord, HolidayRecord and DocumentRecord', () => {
    const leave = decode(LeaveRecord, {
      id: 'leave-1',
      type: 'Annual leave',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      days: 5,
      portion: 'FULL_DAY',
      status: 'APPROVED',
      version: 2,
    })
    expect(leave.days).toBe(5)

    const shift = decode(ShiftRecord, {
      id: 'shift-1',
      name: 'Standard Day',
      start: '08:00',
      end: '17:00',
      version: 1,
    })
    expect(shift.start).toBe('08:00')

    const holiday = decode(HolidayRecord, {
      id: 'hol-1',
      name: 'Water Festival',
      date: '2026-11-20',
      version: 1,
    })
    expect(holiday.name).toBe('Water Festival')

    const doc = decode(DocumentRecord, {
      id: 'doc-1',
      name: 'policy.pdf',
      size: 1024,
      mimeType: 'application/pdf',
      uploadedAt: '2026-10-25T00:00:00Z',
    })
    expect(doc.size).toBe(1024)
  })
})
