import { describe, expect, it } from 'vitest'
import { calculateDonutSegments } from '../../app/utils/chart'

describe('Chart utility', () => {
  it('calculates donut segments with correct percentages and offsets', () => {
    const items = [
      { label: 'Annual', value: 30, color: '#6366f1' },
      { label: 'Sick', value: 10, color: '#f59e0b' },
    ]
    const segments = calculateDonutSegments(items, 40)
    expect(segments).toHaveLength(2)
    expect(segments[0].percentage).toBe(75)
    expect(segments[1].percentage).toBe(25)
    expect(segments[0].strokeDasharray).toBeDefined()
    expect(segments[1].strokeDashoffset).toBeDefined()
  })

  it('handles empty or zero value lists gracefully', () => {
    const segments = calculateDonutSegments([], 40)
    expect(segments).toEqual([])

    const zeroSegments = calculateDonutSegments([{ label: 'None', value: 0 }], 40)
    expect(zeroSegments[0].percentage).toBe(0)
  })
})
