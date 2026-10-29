<script setup lang="ts">
import { titleCase } from '~/utils/format'
import { correctionLocalTime } from '~/utils/correction-input'
const props = defineProps<{
  kind: 'leave' | 'request' | 'correction'
  values: Record<string, any>
}>()
const session = useSessionStore()
function timeLabel(value: unknown) {
  if (!value) return 'Not supplied'
  const zone = session.profile?.timeZone || ''
  const local = correctionLocalTime(String(value), zone)
  return local ? `${local.replace('T', ' ')} · ${zone}` : 'Choose a valid company date and time'
}
const rows = computed(() => {
  const value = props.values
  const rows: [string, string][] = []
  if (props.kind === 'request')
    rows.push(['Request', String(value.title || 'Enter a request title')])
  rows.push([
    'Type',
    props.kind === 'correction'
      ? 'Attendance correction'
      : (
          {
            GENERAL: 'General',
            MATERIAL: 'Material or equipment',
            REMOTE_WORK: 'Remote work',
            LATE_ARRIVAL: 'Late arrival',
            EARLY_LEAVE: 'Early leave',
          } as Record<string, string>
        )[value.type] || titleCase(value.type || 'Choose a type'),
  ])
  if (
    props.kind === 'leave' ||
    ['REMOTE_WORK', 'LATE_ARRIVAL', 'EARLY_LEAVE'].includes(value.type)
  ) {
    rows.push([
      'Dates',
      `${value.startDate || 'Choose start date'} → ${value.endDate || 'Choose end date'}`,
    ])
  }
  if (props.kind === 'leave')
    rows.push([
      'Day portion',
      (
        { FULL_DAY: 'Full day', MORNING: 'Morning only', AFTERNOON: 'Afternoon only' } as Record<
          string,
          string
        >
      )[value.portion] || 'Choose a day portion',
    ])
  if (value.type === 'MATERIAL') {
    rows.push(['Selected item quantity', String(value.quantity || 'Enter a quantity')])
    if (value.items?.length > 1)
      rows.push(['Additional lines', `${value.items.length - 1} retained`])
  }
  if (props.kind === 'correction') {
    rows.push(['Affected date', String(value.date || 'Choose a date')])
    rows.push(['Proposed clock-in', timeLabel(value.proposedClockIn)])
    rows.push(['Proposed clock-out', timeLabel(value.proposedClockOut)])
  } else if (['LATE_ARRIVAL', 'EARLY_LEAVE'].includes(value.type))
    rows.push([
      'Times',
      `${value.fromTime || 'Choose start time'} → ${value.toTime || 'Choose end time'}`,
    ])
  return rows
})
</script>
<template>
  <details class="form-review">
    <summary>Review details</summary>
    <div role="region" aria-label="Request review">
      <dl class="detail-list">
        <div v-for="[label, value] in rows" :key="label">
          <dt>{{ label }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>
      <p>
        {{
          kind === 'request'
            ? 'Save a draft, then submit it from the request details.'
            : 'Send these details for approval. Your company rules are checked when you submit.'
        }}
      </p>
    </div>
  </details>
</template>
