<script setup lang="ts">
import { correctionInstant, correctionLocalTime } from '~/utils/correction-input'
import { clockLabel, tenantDay } from '~/utils/format'
const props = defineProps<{
  values: Record<string, any>
  errors: Record<string, string>
}>()
const session = useSessionStore()
const api = useWorkspace()
const timeZone = computed(() => session.profile?.timeZone || '')
const history = useWorkspaceQuery('attendance', () => api.attendance())
const original = computed(() =>
  (history.data.value?.items || []).filter(
    (row) => timeZone.value && tenantDay(row.clockIn, timeZone.value) === props.values.date,
  ),
)
function clockInput(field: 'proposedClockIn' | 'proposedClockOut') {
  return computed({
    get: () => {
      const value = String(props.values[field] || '')
      return /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? correctionLocalTime(value, timeZone.value) : value
    },
    set: (value: string) => {
      props.values[field] = value ? correctionInstant(value, timeZone.value) || value : ''
    },
  })
}
const clockIn = clockInput('proposedClockIn')
const clockOut = clockInput('proposedClockOut')
</script>

<template>
  <div class="field">
    <label for="form-date">Affected date</label>
    <input
      id="form-date"
      v-model="values.date"
      type="date"
      :aria-invalid="!!errors.date"
      aria-describedby="error-date"
    />
    <small id="error-date" class="field-error">{{ errors.date }}</small>
  </div>

  <section v-if="values.date" class="gentle-note" aria-label="Original attendance">
    <div>
      <strong>Original recorded time</strong>
      <p v-if="history.isPending.value" role="status">Loading recorded sessions…</p>
      <div v-else-if="history.error.value" role="status">
        Recorded sessions are unavailable.
        <PButton label="Retry recorded sessions" text @click="history.refetch()" />
      </div>
      <p v-else-if="!original.length">No session on this date in the loaded history.</p>
      <p v-for="row in original" :key="row.id">
        {{ clockLabel(row.clockIn, timeZone) }} →
        {{
          row.clockOut
            ? `${tenantDay(row.clockOut, timeZone)} ${clockLabel(row.clockOut, timeZone)}`
            : 'Not recorded'
        }}
      </p>
    </div>
  </section>
  <p class="small-note">
    {{
      timeZone
        ? `Choose dates and times in ${timeZone}. For overnight work, use the next date for clock-out.`
        : 'Your workspace time zone is unavailable. Reload your profile before entering a correction.'
    }}
  </p>

  <div class="field">
    <label for="form-reason">What happened?</label>
    <PTextarea
      id="form-reason"
      v-model="values.reason"
      rows="4"
      auto-resize
      placeholder="Add the details your approver needs…"
      :aria-invalid="!!errors.reason"
      aria-describedby="error-reason"
    />
    <small id="error-reason" class="field-error">{{ errors.reason }}</small>
  </div>
  <div class="field">
    <label for="proposed-in">Proposed clock-in</label>
    <input
      id="proposed-in"
      v-model="clockIn"
      type="datetime-local"
      :disabled="!timeZone"
      :aria-invalid="!!errors.proposedClockIn"
      aria-describedby="proposed-in-help proposed-in-error"
    />
    <small id="proposed-in-help"
      >Choose the actual date and time. Your original record stays unchanged until reviewed.</small
    >
    <small id="proposed-in-error" class="field-error">{{ errors.proposedClockIn }}</small>
  </div>
  <div class="field">
    <label for="proposed-out">Proposed clock-out (optional)</label>
    <input
      id="proposed-out"
      v-model="clockOut"
      type="datetime-local"
      :disabled="!timeZone"
      :aria-invalid="!!errors.proposedClockOut"
      aria-describedby="proposed-out-error"
    />
    <small id="proposed-out-error" class="field-error">{{ errors.proposedClockOut }}</small>
  </div>
</template>
