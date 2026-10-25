export interface ChartDataItem {
  label: string
  value: number
  color?: string
}

export interface DonutSegment {
  label: string
  value: number
  color: string
  percentage: number
  strokeDasharray: string
  strokeDashoffset: number
}

const DEFAULT_PALETTE = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#64748b', // Slate
]

/**
 * Calculates SVG stroke-dasharray and stroke-dashoffset for rendering a donut chart.
 * Uses circumference = 2 * PI * radius.
 */
export function calculateDonutSegments(
  items: ChartDataItem[],
  radius: number = 40,
): DonutSegment[] {
  const circumference = 2 * Math.PI * radius
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0)

  let accumulatedPercentage = 0

  return items.map((item, index) => {
    const val = Math.max(0, item.value)
    const percentage = total > 0 ? (val / total) * 100 : 0
    const dashLength = total > 0 ? (val / total) * circumference : 0
    const gapLength = circumference - dashLength

    // Offset starts from previous segments; SVG stroke starts at 3 o'clock (or rotated)
    const strokeDashoffset = -((accumulatedPercentage / 100) * circumference)
    accumulatedPercentage += percentage

    return {
      label: item.label,
      value: val,
      color: item.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length] || '#6366f1',
      percentage: Math.round(percentage * 10) / 10,
      strokeDasharray: `${dashLength} ${gapLength}`,
      strokeDashoffset,
    }
  })
}
