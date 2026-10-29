import { expect, it } from 'vitest'
import { z } from 'zod'
import { allPages } from '../../app/api/collections'
import { DataFailure } from '../../app/data/source'
import type { DataSource } from '../../app/data/source'

const row = z.object({ id: z.string() })
it('loads every page for bounded reference lists', async () => {
  const pages: string[] = []
  const source: DataSource = {
    mode: 'remote',
    async send(r) {
      pages.push(r.query!.page!)
      const page = Number(r.query!.page)
      return { status: 200, data: { items: [{ id: `row-${page}` }], page, size: 1, total: 2 } }
    },
  }
  expect(await allPages(source, '/materials', row, { size: 1 })).toEqual([
    { id: 'row-0' },
    { id: 'row-1' },
  ])
  expect(pages).toEqual(['0', '1'])
})
it.each(['wrong page', 'empty page', 'over limit'])(
  'fails explicitly for %s rather than returning a partial list',
  async (kind) => {
    const source: DataSource = {
      mode: 'remote',
      async send() {
        return {
          status: 200,
          data: {
            items: kind === 'empty page' ? [] : [{ id: 'row' }],
            page: kind === 'wrong page' ? 1 : 0,
            size: 1,
            total: kind === 'over limit' ? 10001 : 2,
          },
        }
      },
    }
    await expect(allPages(source, '/materials', row, { size: 1 })).rejects.toBeInstanceOf(
      DataFailure,
    )
  },
)
