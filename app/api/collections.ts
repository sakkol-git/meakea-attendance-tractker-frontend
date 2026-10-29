import { z } from 'zod'
import { DataFailure } from '../data/source'
import type { DataSource } from '../data/source'
import { decode, pagedCollection } from '../schemas/contracts'

/** Complete small reference lists; large workflow lists use visible server pagers. */
export async function allPages<T extends z.ZodType>(
  source: DataSource,
  path: string,
  schema: T,
  options: { query?: Record<string, string>; size?: number; limit?: number } = {},
): Promise<z.infer<T>[]> {
  const size = options.size ?? 100
  const limit = options.limit ?? 10_000
  const items: z.infer<T>[] = []
  for (let page = 0; page < Math.ceil(limit / size); page++) {
    const response = await source.send({
      method: 'GET',
      path,
      query: { ...options.query, page: String(page), size: String(size) },
    })
    const result = decode(pagedCollection(schema), response.data)
    if (result.total > limit)
      throw new DataFailure(
        0,
        'COLLECTION_LIMIT',
        'This list is too large. Use a narrower server view.',
      )
    if (
      result.page !== page ||
      result.size !== size ||
      result.items.length > size ||
      (result.items.length === 0 && items.length < result.total)
    )
      throw new DataFailure(
        0,
        'CONTRACT_MISMATCH',
        'The list is incomplete. Refresh before continuing.',
      )
    items.push(...result.items)
    if (items.length > result.total)
      throw new DataFailure(
        0,
        'CONTRACT_MISMATCH',
        'The list changed while loading. Refresh before continuing.',
      )
    if (items.length === result.total) return items
  }
  throw new DataFailure(0, 'COLLECTION_LIMIT', 'This list exceeds the supported page limit.')
}
