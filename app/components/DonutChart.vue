<script setup lang="ts">
import { calculateDonutSegments, type ChartDataItem, type DonutSegment } from '~/utils/chart'

const props = withDefaults(
  defineProps<{
    data: ChartDataItem[]
    centerLabel?: string
    centerValue?: string
    unit?: string
    title?: string
  }>(),
  {
    centerLabel: 'Total',
    centerValue: '',
    unit: '',
    title: 'Distribution chart',
  },
)

const hoveredSegment = ref<DonutSegment | null>(null)

const segments = computed(() => calculateDonutSegments(props.data, 40))

const totalValue = computed(() => props.data.reduce((sum, item) => sum + item.value, 0))

const activeLabel = computed(() => {
  if (hoveredSegment.value) return hoveredSegment.value.label
  return props.centerLabel
})

const activeValue = computed(() => {
  if (hoveredSegment.value) {
    return `${hoveredSegment.value.value}${props.unit ? ' ' + props.unit : ''} (${hoveredSegment.value.percentage}%)`
  }
  return props.centerValue || String(totalValue.value)
})
</script>

<template>
  <div class="donut-chart-card">
    <div
      class="chart-visual"
      role="img"
      :aria-label="`${title}: ${segments.map((s) => `${s.label} ${s.percentage}%`).join(', ')}`"
    >
      <svg viewBox="0 0 120 120" class="donut-svg">
        <!-- Background track -->
        <circle
          cx="60"
          cy="60"
          r="40"
          fill="none"
          stroke="var(--surface-border, #e2e8f0)"
          stroke-width="14"
        />

        <!-- Segments -->
        <g transform="rotate(-90 60 60)">
          <circle
            v-for="seg in segments"
            :key="seg.label"
            cx="60"
            cy="60"
            r="40"
            fill="none"
            :stroke="seg.color"
            stroke-width="14"
            :stroke-dasharray="seg.strokeDasharray"
            :stroke-dashoffset="seg.strokeDashoffset"
            class="donut-segment"
            :class="{ active: hoveredSegment?.label === seg.label }"
            @mouseenter="hoveredSegment = seg"
            @mouseleave="hoveredSegment = null"
          />
        </g>

        <!-- Center text -->
        <text x="60" y="56" text-anchor="middle" class="donut-center-value">
          {{ activeValue }}
        </text>
        <text x="60" y="70" text-anchor="middle" class="donut-center-label">
          {{ activeLabel }}
        </text>
      </svg>
    </div>

    <!-- Legend -->
    <div class="donut-legend">
      <div
        v-for="seg in segments"
        :key="seg.label"
        class="legend-item"
        :class="{ active: hoveredSegment?.label === seg.label }"
        @mouseenter="hoveredSegment = seg"
        @mouseleave="hoveredSegment = null"
      >
        <span class="legend-swatch" :style="{ backgroundColor: seg.color }" />
        <span class="legend-label">{{ seg.label }}</span>
        <span class="legend-pct">{{ seg.percentage }}%</span>
      </div>
    </div>
  </div>
</template>
