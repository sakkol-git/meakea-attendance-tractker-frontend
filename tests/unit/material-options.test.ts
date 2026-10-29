import { expect, it } from 'vitest'
import { WorkspaceApi } from '../../app/api/workspace'
import type { DataSource } from '../../app/data/source'

it('loads actual material options without inventing an entity version for a read-only catalog', async () => {
  const source: DataSource = {
    mode: 'remote',
    async send(request) {
      expect(request.path).toBe('/materials')
      expect(request.query).toEqual({ page: '0', size: '100' })
      return {
        status: 200,
        data: {
          items: [
            {
              id: 'material-a',
              name: 'Monitor',
              code: 'MON',
              advisoryStock: 4,
              unit: 'each',
              active: true,
            },
          ],
          page: 0,
          size: 100,
          total: 1,
        },
      }
    },
  }
  const items = await new WorkspaceApi(source).materialOptions()
  expect(items[0]).toMatchObject({ id: 'material-a', name: 'Monitor' })
  expect(items[0]).not.toHaveProperty('version')
})
