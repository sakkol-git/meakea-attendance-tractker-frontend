import { z } from 'zod'
import { DataFailure } from '../data/source.ts'
export const Roles = z.enum(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'OWNER'])
export type Role = z.infer<typeof Roles>
export const Profile = z.object({
  userId: z.string(),
  employeeId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  roles: z.array(Roles).min(1),
  locale: z.string().default('en'),
  email: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  timeZone: z.string().default('UTC'),
})
export type UserProfile = z.infer<typeof Profile>
export const Entity = z
  .object({
    id: z.string(),
    version: z.number().int().positive(),
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
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    date: z.string().optional(),
    days: z.number().optional(),
    createdAt: z.string().optional(),
    decisionReason: z.string().optional(),
    code: z.string().optional(),
    manager: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    quantity: z.number().optional(),
  })
  .passthrough()
export type EntityRow = z.infer<typeof Entity>
export const Attendance = z.object({
  id: z.string(),
  clockIn: z.string().datetime(),
  clockOut: z.string().datetime().nullable(),
  version: z.number().int().positive(),
})
export type AttendanceRow = z.infer<typeof Attendance>
export const Notice = z.object({
  id: z.string(),
  title: z.string(),
  read: z.boolean(),
  detail: z.string().optional(),
  createdAt: z.string().optional(),
  to: z.string().optional(),
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
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  downloadUrl: z.string().optional(),
  version: z.number().int(),
})
export const collection = <T extends z.ZodType>(schema: T) =>
  z.object({ items: z.array(schema), total: z.number().int().nonnegative() })
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
