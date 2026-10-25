import { describe, expect, it } from 'vitest'
import { filterRecords, matchesQuery } from '../../app/utils/filter'

describe('Filter utility', () => {
  const records = [
    { name: 'Alice Smith', email: 'alice@example.com', department: 'Engineering' },
    { name: 'Bob Jones', email: 'bob@example.com', department: 'Design' },
    { name: 'Charlie Brown', email: 'charlie@example.com', department: 'Human Resources' },
  ]

  it('matches single fields case-insensitively', () => {
    expect(matchesQuery(records[0]!, ['name'], 'alice')).toBe(true)
    expect(matchesQuery(records[0]!, ['name'], 'ALICE')).toBe(true)
    expect(matchesQuery(records[0]!, ['name'], 'bob')).toBe(false)
  })

  it('matches multiple fields', () => {
    expect(matchesQuery(records[1]!, ['name', 'department'], 'design')).toBe(true)
    expect(matchesQuery(records[1]!, ['name', 'email'], 'example.com')).toBe(true)
  })

  it('returns true when query is empty or whitespace', () => {
    expect(matchesQuery(records[0]!, ['name'], '')).toBe(true)
    expect(matchesQuery(records[0]!, ['name'], '   ')).toBe(true)
  })

  it('filters an array of records correctly', () => {
    const results = filterRecords(records, ['name', 'department'], 'eng')
    expect(results).toHaveLength(1)
    expect(results[0]?.name).toBe('Alice Smith')
  })

  it('handles null, undefined, or missing fields gracefully', () => {
    const rec = { name: 'Dan', notes: null }
    expect(matchesQuery(rec, ['name', 'notes', 'missing'], 'dan')).toBe(true)
    expect(matchesQuery(rec, ['notes'], 'dan')).toBe(false)
  })
})
