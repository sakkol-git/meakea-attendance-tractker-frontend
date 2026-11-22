<script setup lang="ts">
import { dateLabel, tenantDay } from '~/utils/format'
const api = useWorkspace()
const app = useNuxtApp()
const session = useSessionStore()
const feedback = useFeedback()
const history = useWorkspaceQuery('attendance', () => api.attendance())
const corrections = useWorkspaceQuery('corrections', () => api.list('corrections'))
const pendingInferred = useWorkspaceQuery('pending-inferred-attendance', () =>
  session.mode === 'local'
    ? app.$business.snapshot('BF-011')
    : Promise.resolve({ items: [], references: [], note: '' }),
)
const inferredItem = computed(() =>
  pendingInferred.data.value?.items.find((x) => x.status === 'PENDING'),
)

async function confirmInferred(recordId: string, version: number) {
  const result = await feedback.run(
    () =>
      app.$business.execute('BF-011', 'confirm', { recordId }, crypto.randomUUID(), {
        [recordId]: version,
      }),
    'Attendance session confirmed',
  )
  if (result) {
    await pendingInferred.refetch()
    await history.refetch()
  }
}

async function rejectInferred(recordId: string, version: number) {
  const result = await feedback.run(
    () =>
      app.$business.execute(
        'BF-011',
        'reject',
        { recordId, reason: 'Reported presence was declined by employee.' },
        crypto.randomUUID(),
        { [recordId]: version },
      ),
    'Proposed session declined',
  )
  if (result) {
    await pendingInferred.refetch()
  }
}

const views = useListViewsStore()
const dates = computed(() => views.attendanceDates)
const invalidRange = computed(() => Boolean(dates.value.to && dates.value.from > dates.value.to))
const visible = ref(false)
const rows = computed(() =>
  (history.data.value?.items || [])
    .filter(
      (x) =>
        (!dates.value.from ||
          tenantDay(x.clockIn, session.profile?.timeZone) >= dates.value.from) &&
        (!dates.value.to || tenantDay(x.clockIn, session.profile?.timeZone) <= dates.value.to),
    )
    .toSorted((a, b) => b.clockIn.localeCompare(a.clockIn)),
)
function clearDates() {
  dates.value.from = ''
  dates.value.to = ''
}
</script>
<template>
  <PageHeading
    title="Attendance"
    description="Review recorded sessions and request a correction when something is missing or incorrect."
    eyebrow="YOUR WORKDAY HISTORY"
    ><PButton
      label="Request correction"
      icon="pi pi-flag"
      outlined
      @click="visible = true" /><PButton
      label="Today’s clock"
      icon="pi pi-clock"
      @click="navigateTo('/')"
  /></PageHeading>
  <ProposedAttendanceCard
    v-if="inferredItem"
    :work-date="String(inferredItem.details?.workDate ?? '')"
    :clock-in="String(inferredItem.details?.clockIn ?? '')"
    :clock-out="String(inferredItem.details?.clockOut ?? '')"
    :source="String(inferredItem.details?.source ?? 'INFERRED')"
    :busy="feedback.busy.value"
    @confirm="confirmInferred(inferredItem.id, inferredItem.version)"
    @decline="rejectInferred(inferredItem.id, inferredItem.version)"
  />
  <section class="panel attendance-summary" aria-label="Attendance summary">
    <dl>
      <div>
        <dt>Sessions in view</dt>
        <dd>
          {{
            history.isPending.value || history.error.value || invalidRange
              ? 'Unavailable'
              : rows.length
          }}
        </dd>
      </div>
      <div>
        <dt>Current session</dt>
        <dd>
          {{
            history.isPending.value || history.error.value
              ? 'Unavailable'
              : history.data.value?.items.some((x) => !x.clockOut)
                ? 'Clocked in'
                : 'No open session'
          }}
        </dd>
      </div>
      <div>
        <dt>Time zone</dt>
        <dd>{{ session.profile?.timeZone.replaceAll('_', ' ') }}</dd>
      </div>
    </dl>
  </section>
  <section class="panel no-padding">
    <div class="section-heading padded">
      <div>
        <h2>Recorded sessions</h2>
        <p>Original records stay visible when you report an issue</p>
      </div>
    </div>
    <div class="table-toolbar date-filters">
      <div class="field">
        <label for="history-from">From date</label
        ><input id="history-from" v-model="dates.from" :max="dates.to || undefined" type="date" />
      </div>
      <div class="field">
        <label for="history-to">To date</label
        ><input
          id="history-to"
          v-model="dates.to"
          type="date"
          :min="dates.from || undefined"
          :aria-invalid="invalidRange"
          :aria-describedby="invalidRange ? 'history-range-error' : undefined"
        />
      </div>
      <PButton label="Clear dates" :disabled="!dates.from && !dates.to" text @click="clearDates" />
    </div>
    <p v-if="invalidRange" id="history-range-error" class="field-error padded" role="alert">
      End date must be on or after the start date.
    </p>
    <QueryState
      v-else
      :pending="history.isPending.value"
      :error="history.error.value"
      :empty="!rows.length"
      :title="dates.from || dates.to ? 'No sessions in this date range' : 'No recorded sessions'"
      :message="
        dates.from || dates.to
          ? 'Change or clear the dates to review other sessions.'
          : 'Your sessions appear here after you clock in.'
      "
      @retry="history.refetch()"
      ><AttendanceSessions :rows="rows" :time-zone="session.profile?.timeZone"
    /></QueryState>
  </section>
  <section class="panel">
    <div class="section-heading">
      <div>
        <h2>Attendance corrections</h2>
        <p>Follow the corrections you’ve sent for review</p>
      </div>
    </div>
    <QueryState
      :pending="corrections.isPending.value"
      :error="corrections.error.value"
      :empty="!corrections.data.value?.items.length"
      title="Nothing needs a closer look"
      message="If you spot a missing or incorrect record, report it above."
      @retry="corrections.refetch()"
      ><div v-for="row in corrections.data.value?.items" :key="row.id" class="issue-row">
        <div>
          <strong>{{ dateLabel(row.date) }}</strong>
          <p>{{ row.reason }}</p>
        </div>
        <StatusBadge :status="row.status" /></div
    ></QueryState>
  </section>
  <ResourceForm v-model:visible="visible" kind="correction" />
</template>
