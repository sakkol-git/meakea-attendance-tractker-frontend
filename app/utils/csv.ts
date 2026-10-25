export interface CsvParseResult {
  headers: string[]
  rows: Record<string, string>[]
}

/**
 * Robust RFC 4180 compliant CSV parser.
 * Handles commas inside quoted fields, escaped double quotes (""), and multiline values.
 */
export function parseCsv(text: string): CsvParseResult {
  const table: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  let i = 0
  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        } else {
          inQuotes = false
          i++
          continue
        }
      } else {
        currentField += char
        i++
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
      } else if (char === ',') {
        currentRow.push(currentField.trim())
        currentField = ''
        i++
      } else if (char === '\r' || char === '\n') {
        currentRow.push(currentField.trim())
        currentField = ''
        if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i++
        }
        if (currentRow.some((f) => f.length > 0)) {
          table.push(currentRow)
        }
        currentRow = []
        i++
      } else {
        currentField += char
        i++
      }
    }
  }

  // Push final field and row if any
  currentRow.push(currentField.trim())
  if (currentRow.some((f) => f.length > 0)) {
    table.push(currentRow)
  }

  if (table.length === 0 || !table[0]) {
    return { headers: [], rows: [] }
  }

  const rawHeaders = table[0]
  const headers = rawHeaders.map((h) => h.replace(/^\uFEFF/, '').trim())

  const rows: Record<string, string>[] = []
  for (let r = 1; r < table.length; r++) {
    const rowValues = table[r]
    if (!rowValues || rowValues.every((val) => val === '')) continue

    const rowObj: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      const headerKey = headers[c]
      if (headerKey) {
        rowObj[headerKey] = rowValues[c] ?? ''
      }
    }
    rows.push(rowObj)
  }

  return { headers, rows }
}

/**
 * Generate CSV string from headers and objects.
 * Values containing commas, double quotes, or newlines are wrapped in double quotes.
 */
export function generateCsv(headers: string[], rows: Record<string, unknown>[]): string {
  function escapeField(val: unknown): string {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headerLine = headers.map(escapeField).join(',')
  const rowLines = rows.map((row) => headers.map((h) => escapeField(row[h])).join(','))

  return [headerLine, ...rowLines].join('\n')
}

/**
 * Standard CSV templates for bulk imports.
 */
export function getSampleCsvTemplate(resource: string): {
  headers: string[]
  sampleRow: Record<string, string>
} {
  switch (resource) {
    case 'employees':
    case 'people':
      return {
        headers: ['name', 'email', 'department', 'position'],
        sampleRow: {
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          department: 'Engineering',
          position: 'Software Engineer',
        },
      }
    case 'departments':
      return {
        headers: ['name', 'code', 'manager'],
        sampleRow: {
          name: 'Product Design',
          code: 'DES',
          manager: 'Jane Doe',
        },
      }
    case 'positions':
      return {
        headers: ['title', 'department'],
        sampleRow: {
          title: 'Senior Product Designer',
          department: 'Product Design',
        },
      }
    case 'shifts':
      return {
        headers: ['name', 'start', 'end'],
        sampleRow: {
          name: 'Morning Shift',
          start: '08:00',
          end: '16:30',
        },
      }
    case 'workSites':
      return {
        headers: ['name', 'latitude', 'longitude', 'radiusMeters'],
        sampleRow: {
          name: 'Headquarters Campus',
          latitude: '37.7749',
          longitude: '-122.4194',
          radiusMeters: '150',
        },
      }
    default:
      return {
        headers: ['name', 'description'],
        sampleRow: {
          name: 'Sample Item',
          description: 'Sample description',
        },
      }
  }
}
