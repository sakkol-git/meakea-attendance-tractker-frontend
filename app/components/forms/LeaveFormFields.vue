<script setup lang="ts">
import { calculateWorkingDays, type DayPortion } from '~/utils/working-days'

const props = defineProps<{
  values: Record<string, any>
  errors: Record<string, string>
}>()

const api = useWorkspace()
const holidays = useWorkspaceQuery('form-holidays', () => api.list('holidays'))
const holidayDates = computed(() => (holidays.data.value?.items || []).map((h) => String(h.date)))

const workingDaysBreakdown = computed(() =>
  calculateWorkingDays(
    String(props.values.startDate || ''),
    String(props.values.endDate || ''),
    (props.values.portion as DayPortion) || 'FULL_DAY',
    holidayDates.value,
  ),
)
</script>

<template>
  <div class="field">
    <label for="form-portion">Day portion</label>
    <PSelect
      input-id="form-portion"
      v-model="values.portion"
      aria-label="Day portion"
      :options="[
        { label: 'Full day', value: 'FULL_DAY' },
        { label: 'Morning half-day', value: 'MORNING' },
        { label: 'Afternoon half-day', value: 'AFTERNOON' },
      ]"
      option-label="label"
      option-value="value"
    />
    <small>Half-day requests use a single working date.</small>
  </div>

  <div class="field">
    <label for="form-type">Leave type</label>
    <PSelect
      input-id="form-type"
      v-model="values.type"
      :options="['Annual leave', 'Medical leave', 'Personal leave']"
      aria-label="Leave type"
      placeholder="Select a leave type"
      :invalid="!!errors.type"
      :aria-invalid="!!errors.type"
      aria-describedby="error-type"
    />
    <small id="error-type" class="field-error">{{ errors.type }}</small>
  </div>

  <div class="form-grid">
    <div class="field">
      <label for="form-start">From</label>
      <input
        id="form-start"
        v-model="values.startDate"
        type="date"
        :aria-invalid="!!errors.startDate"
        aria-describedby="error-start"
      />
      <small id="error-start" class="field-error">{{ errors.startDate }}</small>
    </div>
    <div class="field">
      <label for="form-end">To</label>
      <input
        id="form-end"
        v-model="values.endDate"
        type="date"
        :aria-invalid="!!errors.endDate"
        aria-describedby="error-end"
      />
      <small id="error-end" class="field-error">{{ errors.endDate }}</small>
    </div>
  </div>

  <div v-if="workingDaysBreakdown?.valid" class="gentle-note form-note" role="status">
    <AppIcon name="clock" />
    <div>
      <strong>
        {{ workingDaysBreakdown.days }}
        {{ workingDaysBreakdown.days === 1 ? 'working day' : 'working days' }}
      </strong>
      <span
        v-if="workingDaysBreakdown.weekendDays || workingDaysBreakdown.holidayDays"
        class="note-subtext"
      >
        ({{ workingDaysBreakdown.weekendDays }} weekend day(s) &
        {{ workingDaysBreakdown.holidayDays }} holiday(s) excluded)
      </span>
    </div>
  </div>

  <div class="field">
    <label for="form-reason">A little context</label>
    <PTextarea
      id="form-reason"
      v-model="values.reason"
      rows="3"
      :aria-invalid="!!errors.reason"
      aria-describedby="error-reason"
    />
    <small id="error-reason" class="field-error">{{ errors.reason }}</small>
  </div>
</template>
