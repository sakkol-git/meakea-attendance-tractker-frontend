import { z } from 'zod'
export const leaveForm = z
  .object({
    type: z.string().min(1, 'Choose a leave type.'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a start date.'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose an end date.'),
    reason: z.string().trim().min(5, 'Add at least five characters of context.').max(2000),
  })
  .refine((x) => x.endDate >= x.startDate, {
    message: 'End date must be on or after the start date.',
    path: ['endDate'],
  })
export const requestForm = z.object({
  title: z.string().trim().min(3, 'Use at least three characters.').max(160),
  type: z.string().min(1, 'Choose a request type.'),
  reason: z.string().trim().min(5, 'Tell your approver what you need.').max(2000),
  quantity: z.number().int().min(1).max(100).default(1),
})
export const correctionForm = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the affected date.'),
  reason: z.string().trim().min(10, 'Explain the issue in at least ten characters.').max(2000),
})
export const employeeForm = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(120),
  email: z.email('Enter a valid email address.'),
  department: z.string().trim().min(1, 'Choose a department.'),
  position: z.string().trim().min(1, 'Enter a position.'),
})
export const loginForm = z.object({
  tenant: z.string().trim().min(1, 'Enter your workspace.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})
