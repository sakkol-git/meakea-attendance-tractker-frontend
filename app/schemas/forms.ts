import { z } from 'zod'
const calendarDate = (message: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((value) => {
      const date = new Date(`${value}T12:00:00Z`)
      return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value
    }, 'Choose a real calendar date.')
export const leaveForm = z
  .object({
    type: z.string().min(1, 'Choose a leave type.'),
    portion: z.enum(['FULL_DAY', 'MORNING', 'AFTERNOON']).default('FULL_DAY'),
    startDate: calendarDate('Choose a start date.'),
    endDate: calendarDate('Choose an end date.'),
    reason: z.string().trim().min(5, 'Add at least five characters of context.').max(2000),
  })
  .refine((x) => x.endDate >= x.startDate, {
    message: 'End date must be on or after the start date.',
    path: ['endDate'],
  })
export const requestForm = z
  .object({
    title: z.string().trim().min(3, 'Use at least three characters.').max(160),
    type: z.enum([
      'GENERAL',
      'MATERIAL',
      'REMOTE_WORK',
      'LATE_ARRIVAL',
      'EARLY_LEAVE',
      'General',
      'Equipment',
      'Remote work',
    ]),
    reason: z.string().trim().min(5, 'Tell your approver what you need.').max(2000),
    quantity: z.number().int().min(1).max(100).nullable().default(1),
    materialId: z.string().nullable().optional(),
    items: z
      .array(
        z.object({
          materialId: z.string().min(1),
          quantity: z.number().int().min(1).max(100),
        }),
      )
      .optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    fromTime: z.string().nullable().optional(),
    toTime: z.string().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.type === 'MATERIAL' && !value.materialId && !value.items?.length)
      context.addIssue({ code: 'custom', path: ['materialId'], message: 'Choose a material.' })
    if (['REMOTE_WORK', 'LATE_ARRIVAL', 'EARLY_LEAVE'].includes(value.type)) {
      if (!value.startDate)
        context.addIssue({ code: 'custom', path: ['startDate'], message: 'Choose a start date.' })
      if (!value.endDate)
        context.addIssue({ code: 'custom', path: ['endDate'], message: 'Choose an end date.' })
      if (value.startDate && value.endDate && value.endDate < value.startDate)
        context.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: 'End date must follow start date.',
        })
    }
    if (['LATE_ARRIVAL', 'EARLY_LEAVE'].includes(value.type)) {
      if (!value.fromTime || !value.toTime || value.toTime <= value.fromTime)
        context.addIssue({
          code: 'custom',
          path: ['toTime'],
          message: 'End time must follow start time.',
        })
    }
  })
export const correctionForm = z.object({
  date: calendarDate('Choose the affected date.'),
  reason: z.string().trim().min(10, 'Explain the issue in at least ten characters.').max(2000),
})
export const employeeForm = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(120),
  email: z.email('Enter a valid email address.'),
  employeeNo: z.string().trim().max(50).optional().or(z.literal('')),
  hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid calendar date.')
    .optional()
    .or(z.literal('')),
  department: z.string().trim().min(1, 'Choose a department.'),
  position: z.string().trim().min(1, 'Enter a position.'),
  manager: z.string().optional().or(z.literal('')),
})
export const setupWorkspaceForm = z.object({
  name: z.string().trim().min(3, 'Enter at least 3 characters.').max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,50}$/, 'Use 3–50 lowercase letters, numbers or hyphens.'),
  ownerName: z.string().trim().min(3, 'Enter the owner name.').max(120),
  ownerEmail: z.email('Enter a valid work email address.'),
  bootstrapCode: z.string().trim().optional().or(z.literal('')),
  timezone: z.string().trim().default('Asia/Phnom_Penh'),
  locale: z.string().trim().default('en'),
})
export const loginForm = z.object({
  tenant: z.string().trim().min(1, 'Enter your workspace.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})
export const forgotPasswordForm = z.object({
  email: z.email('Enter a valid email address.'),
})
export const resetPasswordForm = z
  .object({
    token: z.string().trim().min(1, 'A valid reset token is required.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
export const changePasswordForm = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
export const profileForm = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  timeZone: z.string().trim().min(1, 'Choose a time zone.'),
})
