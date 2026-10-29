import { expect, it } from 'vitest'
import { requestRecord } from '../../app/features/requests/data/record'
import { requestDraftValues } from '../../app/utils/request-form'
it('retains persisted material selection when opening a provider draft for editing', () => {
  const record = requestRecord({
    id: 'request-a',
    version: 0,
    status: 'DRAFT',
    type: 'MATERIAL',
    lines: [{ id: 'line-a', materialItemId: 'material-a', quantity: 2, notes: 'Existing note' }],
    steps: [],
  })
  expect(record.items).toEqual([
    {
      id: 'line-a',
      materialItemId: 'material-a',
      materialId: 'material-a',
      quantity: 2,
      notes: 'Existing note',
    },
  ])
})

it('draft form starts with the persisted first line while retaining additional lines', () => {
  const row = requestRecord({
    id: 'request-a',
    version: 0,
    lines: [
      { materialItemId: 'first', quantity: 2 },
      { materialItemId: 'second', quantity: 3 },
    ],
  })
  const form = requestDraftValues(row)
  expect(form.materialId).toBe('first')
  expect(form.quantity).toBe(2)
  expect(form.items).toHaveLength(2)
})
