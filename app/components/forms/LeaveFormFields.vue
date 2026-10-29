<script setup lang="ts">
import { calculateWorkingDays, type DayPortion } from '~/utils/working-days'
import { failureMessage } from '~/utils/failure'
import LeaveOwnerPreview from './LeaveOwnerPreview.vue'

const props = defineProps<{
  values: Record<string, any>
  errors: Record<string, string>
}>()

const api = useWorkspace()
const types = useWorkspaceQuery('form-leave-types', () =>
  api.mode === 'remote' ? api.leave.types() : Promise.resolve([]),
)
const typeOptions = computed(() =>
  api.mode === 'remote'
    ? (types.data.value || []).map((type) => ({ label: type.name, value: type.code }))
    : ['Annual leave', 'Sick leave', 'Personal leave'].map((value) => ({ label: value, value })),
)
const holidays = useWorkspaceQuery('form-holidays', () =>
  api.mode === 'local' ? api.list('holidays') : Promise.resolve({ items: [], total: 0 }),
)
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
    <label for="form-type">Leave type</label>
    <PSelect
      input-id="form-type"
      v-model="values.type"
      :options="typeOptions"
      option-label="label"
      option-value="value"
      :loading="api.mode === 'remote' && types.isPending.value"
      aria-label="Leave type"
      placeholder="Select a leave type"
      :invalid="!!errors.type"
      :aria-invalid="!!errors.type"
      aria-describedby="error-type"
    />
    <small id="error-type" class="field-error">{{ errors.type }}</small>
    <small v-if="types.error.value" role="alert" class="field-error">{{
      failureMessage(types.error.value)
    }}</small>
    <small v-else-if="api.mode === 'remote' && types.isSuccess.value && !typeOptions.length"
      >No leave types are configured. Contact HR.</small
    >
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

  <div class="field">
    <label for="form-portion">Day portion</label>
    <PSelect
      input-id="form-portion"
      v-model="values.portion"
      aria-label="Day portion"
      :options="[
        { label: 'Full day', value: 'FULL_DAY' },
        { label: 'Morning only', value: 'MORNING' },
        { label: 'Afternoon only', value: 'AFTERNOON' },
      ]"
      option-label="label"
      option-value="value"
    />
    <small
      >Half-day requests use one date. Submit separate requests for different calendar years.</small
    >
  </div>

  <LeaveOwnerPreview v-if="api.mode === 'remote'" :values="values" />
  <div v-else-if="workingDaysBreakdown?.valid" class="gentle-note form-note" role="status">
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
    <label for="form-reason">Reason</label>
    <PTextarea
      id="form-reason"
      v-model="values.reason"
      rows="3"
      placeholder="Add enough detail for your reviewer."
      :aria-invalid="!!errors.reason"
      aria-describedby="error-reason"
    />
    <small id="error-reason" class="field-error">{{ errors.reason }}</small>
  </div>
</template>
