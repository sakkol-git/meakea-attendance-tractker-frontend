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
  AuditEntry,
  ExportJob,
} from '../../app/schemas/contracts'
import { DataFailure } from '../../app/data/source'

describe('Domain typed Zod contracts', () => {
  it('validates and decodes a complete EmployeeRecord', () => {
    const raw = {
      id: 'emp-101',
      name: 'Alice Cooper',
      email: 'alice@example.com',
      employeeNo: 'EMP-101',
      departmentId: 'dep-1',
      positionId: 'pos-1',
      department: 'Engineering',
      position: 'Staff Engineer',
      manager: 'Bob Leader',
      status: 'ACTIVE',
      version: 0,
    }
    const decoded = decode(EmployeeRecord, raw)
    expect(decoded.name).toBe('Alice Cooper')
    expect(decoded.version).toBe(0)
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
      radiusM: 200,
      timezone: 'Asia/Phnom_Penh',
      version: 0,
    })
    expect(site.radiusM).toBe(200)

    expect(() =>
      decode(WorkSiteRecord, {
        id: 'site-2',
        name: 'Invalid Site',
        latitude: 'bad',
        longitude: 104.9,
        radiusM: -50,
        timezone: 'Asia/Phnom_Penh',
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
      startTime: '08:00',
      endTime: '17:00',
      siteId: 'site-1',
      timezone: 'Asia/Phnom_Penh',
      version: 0,
    })
    expect(shift.startTime).toBe('08:00')

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
  it('validates audit records and rejects malformed timestamps', () => {
    const row = decode(AuditEntry, {
      id: 'audit-1',
      at: '2026-10-26T01:02:03Z',
      actor: 'HR Admin',
      action: 'REQUEST_APPROVED',
      entityId: 'request-1',
    })
    expect(row.action).toBe('REQUEST_APPROVED')
    expect(() => decode(AuditEntry, { ...row, at: 'not-a-time' })).toThrow(DataFailure)
  })

  it('preserves the positive ExportJob wire version required by existing consumers', () => {
    const job = decode(ExportJob, {
      id: 'job-101',
      status: 'QUEUED',
      version: 1,
    })
    expect(job.id).toBe('job-101')
    expect(job.version).toBe(1)
    expect(() => decode(ExportJob, { id: 'job-101', status: 'QUEUED', version: 0 })).toThrow(
      DataFailure,
    )
  })
})
