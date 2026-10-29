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

async function confirmInferred(recordId: string) {
  const result = await feedback.run(
    () => app.$business.execute('BF-011', 'confirm', { recordId }, crypto.randomUUID()),
    'Attendance session confirmed',
  )
  if (result) {
    await pendingInferred.refetch()
    await history.refetch()
  }
}

async function rejectInferred(recordId: string) {
  const result = await feedback.run(
    () =>
      app.$business.execute(
        'BF-011',
        'reject',
        { recordId, reason: 'Reported presence was declined by employee.' },
        crypto.randomUUID(),
      ),
    'Proposed session declined',
  )
  if (result) {
    await pendingInferred.refetch()
  }
}

const from = ref('')
const to = ref('')
const visible = ref(false)
const rows = computed(() =>
  (history.data.value?.items || [])
    .filter(
      (x) =>
        (!from.value || tenantDay(x.clockIn, session.profile?.timeZone) >= from.value) &&
        (!to.value || tenantDay(x.clockIn, session.profile?.timeZone) <= to.value),
    )
    .toSorted((a, b) => b.clockIn.localeCompare(a.clockIn)),
)
function clearDates() {
  from.value = ''
  to.value = ''
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
  <section v-if="inferredItem" class="panel inferred-review-panel">
    <div class="inferred-badge">
      <AppIcon name="clock" />
      <span>Review proposed attendance</span>
    </div>
    <div class="inferred-body">
      <div>
        <h3>{{ inferredItem.title }} · {{ String(inferredItem.details?.workDate ?? '') }}</h3>
        <p>
          Proposed attendance from
          <strong>{{ String(inferredItem.details?.clockIn ?? '') }}</strong> to
          <strong>{{ String(inferredItem.details?.clockOut ?? '') }}</strong
          >.
        </p>
        <small class="subtle"
          >Source: {{ String(inferredItem.details?.source ?? 'INFERRED') }} (Wi-Fi &amp; BLE beacon
          cluster)</small
        >
      </div>
      <div class="inline-actions">
        <PButton
          label="Confirm workday"
          icon="pi pi-check"
          :loading="feedback.busy.value"
          @click="confirmInferred(inferredItem.id)"
        />
        <PButton
          label="Decline"
          severity="secondary"
          outlined
          :disabled="feedback.busy.value"
          @click="rejectInferred(inferredItem.id)"
        />
      </div>
    </div>
  </section>
  <section class="panel attendance-summary" aria-label="Attendance summary">
    <dl>
      <div>
        <dt>Sessions in view</dt>
        <dd>{{ history.isPending.value || history.error.value ? 'Unavailable' : rows.length }}</dd>
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
        ><input id="history-from" v-model="from" type="date" />
      </div>
      <div class="field">
        <label for="history-to">To date</label
        ><input id="history-to" v-model="to" type="date" :min="from" />
      </div>
      <PButton label="Clear dates" text @click="clearDates" />
    </div>
    <QueryState
      :pending="history.isPending.value"
      :error="history.error.value"
      :empty="!rows.length"
      title="No recorded sessions"
      message="Try a different date range, or clock in from your overview."
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
