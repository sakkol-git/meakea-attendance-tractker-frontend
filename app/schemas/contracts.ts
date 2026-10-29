import { z } from 'zod'
import { DataFailure } from '../data/source.ts'
export const Roles = z.enum(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'OWNER'])
export type Role = z.infer<typeof Roles>
export const Profile = z.object({
  userId: z.string().optional(),
  employeeId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  roles: z.array(Roles).min(1),
  locale: z.string().default('en'),
  email: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  timeZone: z.string().min(1),
})
export type UserProfile = z.infer<typeof Profile>
export const Entity = z
  .object({
    id: z.string(),
    version: z.number().int().nonnegative(),
    status: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    reason: z.string().optional(),
    description: z.string().optional(),
    employeeId: z.string().optional(),
    employeeName: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    email: z.string().optional(),
    type: z.string().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    date: z.string().optional(),
    days: z.number().optional(),
    createdAt: z.string().optional(),
    decisionReason: z.string().optional(),
    code: z.string().optional(),
    manager: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    quantity: z.number().nullable().optional(),
    fulfilledQuantity: z.number().optional(),
    history: z
      .array(
        z
          .object({
            status: z.string(),
            at: z.string(),
            reason: z.string().optional(),
            materialId: z.string().optional(),
            materialName: z.string().optional(),
            quantity: z.number().optional(),
            requestedQuantity: z.number().optional(),
            issuedBefore: z.number().optional(),
            remainingAfter: z.number().optional(),
            stockBefore: z.number().optional(),
            stockAfter: z.number().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough()
export type EntityRow = z.infer<typeof Entity>
export const Attendance = z.object({
  id: z.string(),
  clockIn: z.string().datetime(),
  clockOut: z.string().datetime().nullable(),
  version: z.number().int().nonnegative(),
  etag: z.string().min(1).optional(),
})
export type AttendanceRow = z.infer<typeof Attendance>
export const Notice = z.object({
  id: z.string(),
  title: z.string(),
  read: z.boolean(),
  detail: z.string().optional(),
  createdAt: z.string().optional(),
  to: z.string().nullish(),
  kind: z.string().nullish(),
  recordId: z.string().nullish(),
})
export type NoticeRow = z.infer<typeof Notice>
export const Balance = z.object({
  type: z.string(),
  available: z.number(),
  pending: z.number(),
  unit: z.string(),
  year: z.number().int(),
})
export const Preferences = z.object({
  email: z.boolean(),
  inApp: z.boolean(),
  reminders: z.boolean(),
  version: z.number().int(),
})
export type PreferenceValues = z.infer<typeof Preferences>
export const Report = z.object({
  attendance: z.array(z.object({ label: z.string(), recorded: z.number(), expected: z.number() })),
  leaveByType: z.array(z.object({ label: z.string(), value: z.number() })),
  dataAsOf: z.string(),
  teamSize: z.number().int(),
  pendingApprovals: z.number().int(),
})
export const ExportJob = z.object({
  id: z.string(),
  status: z.enum(['QUEUED', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  downloadUrl: z.string().optional(),
  version: z.number().int().positive(),
})
export const AuditEntry = z.object({
  id: z.string().min(1),
  at: z.string().datetime(),
  actor: z.string().min(1),
  action: z.string().min(1),
  entityId: z.string().min(1),
  reason: z.string().optional(),
  changes: z
    .record(z.string(), z.object({ before: z.unknown().optional(), after: z.unknown().optional() }))
    .optional(),
})
export type AuditEntry = z.infer<typeof AuditEntry>
export const ApprovalDelegation = z.object({
  id: z.string(),
  delegateId: z.string(),
  delegateName: z.string(),
  startsOn: z.string(),
  endsOn: z.string(),
  reason: z.string(),
  status: z.enum(['ACTIVE', 'CANCELLED']),
  version: z.number().int().positive(),
})
export const EligibleDelegate = z.object({ id: z.string(), name: z.string() })
export type ApprovalDelegation = z.infer<typeof ApprovalDelegation>
export type EligibleDelegate = z.infer<typeof EligibleDelegate>
export const collection = <T extends z.ZodType>(schema: T) =>
  z.object({ items: z.array(schema), total: z.number().int().nonnegative() })
export const pagedCollection = <T extends z.ZodType>(schema: T) =>
  collection(schema).extend({
    page: z.number().int().nonnegative(),
    size: z.number().int().min(1).max(100),
  })
export function decode<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value)
  if (!parsed.success)
    throw new DataFailure(
      0,
      'CONTRACT_MISMATCH',
      'The server response does not match this feature’s contract. Your data has not been replaced with demo data.',
    )
  return parsed.data
}

export const EmployeeRecord = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    employeeNo: z.string(),
    departmentId: z.string(),
    positionId: z.string(),
    managerId: z.string().nullable().optional(),
    hireDate: z.string().nullable().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    manager: z.string().optional(),
    status: z.string().optional(),
    version: z.number().int().nonnegative(),
  })
  .passthrough()
export type EmployeeRecord = z.infer<typeof EmployeeRecord>

export const DepartmentRecord = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string().optional(),
    manager: z.string().optional(),
    description: z.string().optional(),
    version: z.number().int().positive(),
  })
  .passthrough()
export type DepartmentRecord = z.infer<typeof DepartmentRecord>

export const PositionRecord = z
  .object({
    id: z.string(),
    title: z.string(),
    department: z.string().optional(),
    description: z.string().optional(),
    version: z.number().int().positive(),
  })
  .passthrough()
export type PositionRecord = z.infer<typeof PositionRecord>

export const WorkSiteRecord = z
  .object({
    id: z.string(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    radiusM: z.number().positive(),
    timezone: z.string(),
    version: z.number().int().nonnegative(),
  })
  .passthrough()
export type WorkSiteRecord = z.infer<typeof WorkSiteRecord>

export const LeaveRecord = z
  .object({
    id: z.string(),
    employeeId: z.string().optional(),
    employeeName: z.string().optional(),
    type: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    days: z.number(),
    portion: z.enum(['FULL_DAY', 'MORNING', 'AFTERNOON']).optional(),
    reason: z.string().optional(),
    status: z.string(),
    version: z.number().int().positive(),
    createdAt: z.string().optional(),
  })
  .passthrough()
export type LeaveRecord = z.infer<typeof LeaveRecord>

export const ShiftRecord = z
  .object({
    id: z.string(),
    name: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    siteId: z.string(),
    timezone: z.string(),
    version: z.number().int().nonnegative(),
  })
  .passthrough()
export type ShiftRecord = z.infer<typeof ShiftRecord>

export const HolidayRecord = z
  .object({
    id: z.string(),
    name: z.string(),
    date: z.string(),
    version: z.number().int().positive(),
  })
  .passthrough()
export type HolidayRecord = z.infer<typeof HolidayRecord>

export const DocumentRecord = z
  .object({
    id: z.string(),
    name: z.string(),
    size: z.number().int().nonnegative(),
    mimeType: z.string(),
    uploadedAt: z.string(),
    url: z.string().optional(),
    version: z.number().int().positive().optional(),
  })
  .passthrough()
export type DocumentRecord = z.infer<typeof DocumentRecord>
