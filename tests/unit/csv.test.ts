import { describe, expect, it } from 'vitest'
import { generateCsv, getSampleCsvTemplate, parseCsv } from '../../app/utils/csv'

describe('CSV utility', () => {
  it('parses standard comma-separated values', () => {
    const input = `name,email,department,position
Alice Smith,alice@example.com,Engineering,Software Engineer
Bob Jones,bob@example.com,Design,Product Designer`

    const result = parseCsv(input)
    expect(result.headers).toEqual(['name', 'email', 'department', 'position'])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({
      name: 'Alice Smith',
      email: 'alice@example.com',
      department: 'Engineering',
      position: 'Software Engineer',
    })
    expect(result.rows[1]).toEqual({
      name: 'Bob Jones',
      email: 'bob@example.com',
      department: 'Design',
      position: 'Product Designer',
    })
  })

  it('handles quotes, commas inside quotes, and escaped quotes', () => {
    const input = `"name","notes","department"
"Smith, John","Has ""senior"" title, lead engineer","Engineering"`

    const result = parseCsv(input)
    expect(result.headers).toEqual(['name', 'notes', 'department'])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toEqual({
      name: 'Smith, John',
      notes: 'Has "senior" title, lead engineer',
      department: 'Engineering',
    })
  })

  it('skips empty rows and handles trailing whitespace', () => {
    const input = `name, email \r\n\r\n Alice , alice@example.com \r\n   \r\n`
    const result = parseCsv(input)
    expect(result.headers).toEqual(['name', 'email'])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
    })
  })

  it('generates properly formatted and escaped CSV', () => {
    const headers = ['name', 'department', 'description']
    const rows = [
      { name: 'Alice', department: 'Engineering', description: 'Staff Engineer' },
      { name: 'Smith, Bob', department: 'Sales', description: 'VP, "Enterprise" Sales' },
    ]
    const output = generateCsv(headers, rows)
    expect(output).toContain('name,department,description')
    expect(output).toContain('Alice,Engineering,Staff Engineer')
    expect(output).toContain('"Smith, Bob",Sales,"VP, ""Enterprise"" Sales"')
  })

  it('provides sample templates for resources', () => {
    const employeeTemplate = getSampleCsvTemplate('employees')
    expect(employeeTemplate.headers).toContain('name')
    expect(employeeTemplate.headers).toContain('email')
    expect(employeeTemplate.sampleRow.name).toBeDefined()
  })
})
