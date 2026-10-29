import { z } from 'zod'
import { decode, Entity } from '../../../schemas/contracts'

const RequestRecord = Entity.extend({
  lines: z
    .array(
      z.object({
        id: z.string().optional(),
        materialItemId: z.string(),
        quantity: z.number().int().positive(),
        notes: z.string().nullable().optional(),
      }),
    )
    .optional(),
})

/** Retain owner line IDs/selections when the existing draft form is reopened. */
export function requestRecord(value: unknown) {
  const row = decode(RequestRecord, value)
  return row.items === undefined && row.lines
    ? { ...row, items: row.lines.map((line) => ({ ...line, materialId: line.materialItemId })) }
    : row
}
