import { z } from 'zod'
import { allPages } from '../../../api/collections'
import type { DataResponse, DataSource, RecordData } from '../../../data/source'
import { Balance, decode } from '../../../schemas/contracts'

const LeaveType = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  paid: z.boolean(),
  allowHalfDay: z.boolean(),
  evidenceRequired: z.boolean(),
  minimumNoticeDays: z.number().int().nonnegative(),
})
const calculation = {
  chargeableDays: z.number().nonnegative(),
  allowHalfDay: z.boolean(),
  evidenceRequired: z.boolean(),
  minimumNoticeDays: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
}
const LeavePreview = z.discriminatedUnion('balanceTracked', [
  z.object({
    ...calculation,
    balanceTracked: z.literal(false),
    balanceBefore: z.null(),
    balanceAfter: z.null(),
  }),
  z.object({
    ...calculation,
    balanceTracked: z.literal(true),
    balanceBefore: z.number(),
    balanceAfter: z.number(),
  }),
])
export type LeavePreview = z.infer<typeof LeavePreview>
export type LeaveType = z.infer<typeof LeaveType>

/** Actual leave owner contracts. Local demonstration calendars stay outside this adapter. */
export class LeaveApi {
  constructor(
    private source: DataSource,
    private command: (path: string, body: RecordData) => Promise<DataResponse>,
  ) {}

  async types(): Promise<LeaveType[]> {
    return allPages(this.source, '/leave/types', LeaveType, { limit: 1000 })
  }

  async balances(year?: number, employeeId?: string) {
    const items = await allPages(this.source, '/leave/balances/me', Balance, {
      query: {
        ...(year ? { year: String(year) } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      size: 25,
    })
    return { items, total: items.length }
  }

  async preview(input: RecordData): Promise<LeavePreview> {
    return decode(LeavePreview, (await this.command('/leave/requests/preview', input)).data)
  }
}
