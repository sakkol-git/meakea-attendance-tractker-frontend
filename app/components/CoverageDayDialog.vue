<script setup lang="ts">
import type { CalendarDay } from '~/utils/calendar'
import { coverageLabel } from '~/utils/calendar'
import { dateLabel } from '~/utils/format'

defineProps<{
  visible: boolean
  day?: CalendarDay
  teamSize: number
  threshold: number
}>()
const emit = defineEmits<{ 'update:visible': [boolean] }>()
</script>

<template>
  <PDialog
    :visible="visible"
    modal
    :header="day ? dateLabel(`${day.dateStr}T12:00:00Z`, 'EEEE, MMMM d') : 'Coverage details'"
    class="dialog-md"
    @update:visible="emit('update:visible', $event)"
  >
    <template v-if="day">
      <p class="info-banner" role="status">{{ coverageLabel(day, teamSize, threshold) }}</p>
      <p v-if="day.holidayName" class="small-note">Company holiday: {{ day.holidayName }}</p>
      <ul v-if="day.absences.length" class="coverage-people-list">
        <li v-for="absence in day.absences" :key="absence.id">
          <strong>{{ absence.employeeName }}</strong>
          <span>{{ absence.type }} · {{ absence.status }}</span>
        </li>
      </ul>
      <p v-else>No team members are recorded as off on this day.</p>
    </template>
  </PDialog>
</template>
