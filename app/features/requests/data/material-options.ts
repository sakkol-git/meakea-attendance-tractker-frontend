import { z } from 'zod'
import { allPages } from '../../../api/collections'
import type { DataSource } from '../../../data/source'
import { collection, decode } from '../../../schemas/contracts'

const MaterialOption = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().optional(),
  advisoryStock: z.number().int().nonnegative().optional(),
  unit: z.string().optional(),
})

/** Materials offered for requests are advisory choices, not editable/versioned records. */
export async function materialOptions(source: DataSource) {
  if (source.mode === 'remote')
    return allPages(source, '/materials', MaterialOption, { limit: 1000 })
  return decode(
    collection(MaterialOption),
    (await source.send({ method: 'GET', path: '/materials' })).data,
  ).items
}
