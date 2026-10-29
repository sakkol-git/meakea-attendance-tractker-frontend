/** Populate the single-line editor while retaining additional persisted selections. */
export function requestDraftValues(row: Record<string, unknown>) {
  const items = Array.isArray(row.items) ? row.items : []
  const first = items[0]
  return first && typeof first === 'object'
    ? { ...row, materialId: first.materialId, quantity: first.quantity }
    : row
}
