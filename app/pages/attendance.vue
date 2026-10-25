<script setup lang="ts">
import { clockLabel, dateLabel, duration, tenantDay } from '~/utils/format'
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
    description="Every workday has a story. Here’s yours, clearly recorded."
    eyebrow="YOUR WORKDAY HISTORY"
    ><PButton label="Report an issue" icon="pi pi-flag" outlined @click="visible = true" /><PButton
      label="Today’s clock"
      icon="pi pi-clock"
      @click="navigateTo('/')"
  /></PageHeading>
  <AttendanceGeoCard />
  <section v-if="inferredItem" class="panel inferred-review-panel">
    <div class="inferred-badge">
      <AppIcon name="clock" />
      <span>ACTION REQUIRED · WORKDAY CONFIRMATION (BF-011)</span>
    </div>
    <div class="inferred-body">
      <div>
        <h3>{{ inferredItem.title }} · {{ String(inferredItem.details?.workDate ?? '') }}</h3>
        <p>
          Passive telemetry detected presence from
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
  <div class="attendance-stats">
    <section class="panel">
      <span class="eyebrow">RECORDS IN VIEW</span><strong>{{ rows.length }}</strong
      ><small>Recorded sessions</small>
    </section>
    <section class="panel">
      <span class="eyebrow">CURRENT SESSION</span
      ><strong class="stat-label">{{
        rows.some((x) => !x.clockOut) ? 'Clocked in' : 'No open session'
      }}</strong
      ><small>Based on your latest records</small>
    </section>
    <section class="panel">
      <span class="eyebrow">YOUR TIMEZONE</span
      ><strong class="stat-label">{{ session.profile?.timeZone.replaceAll('_', ' ') }}</strong
      ><small>Displayed in your workspace timezone</small>
    </section>
  </div>
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
      ><PDataTable
        :value="rows"
        :paginator="rows.length > 8"
        :rows="8"
        :pt="{
          tableContainer: { role: 'region', 'aria-label': 'Attendance sessions', tabindex: 0 },
        }"
        ><PColumn header="Date"
          ><template #body="{ data }"
            ><strong>{{ tenantDay(data.clockIn, session.profile?.timeZone) }}</strong></template
          ></PColumn
        ><PColumn header="Clock in"
          ><template #body="{ data }">{{
            clockLabel(data.clockIn, session.profile?.timeZone)
          }}</template></PColumn
        ><PColumn header="Clock out"
          ><template #body="{ data }">{{
            clockLabel(data.clockOut, session.profile?.timeZone)
          }}</template></PColumn
        ><PColumn header="Duration"
          ><template #body="{ data }">{{
            duration(data.clockIn, data.clockOut)
          }}</template></PColumn
        ><PColumn header="Recorded state"
          ><template #body="{ data }"
            ><StatusBadge
              :status="data.clockOut ? 'COMPLETED' : 'ACTIVE'" /></template></PColumn></PDataTable
    ></QueryState>
  </section>
  <section class="panel">
    <div class="section-heading">
      <div>
        <h2>Attendance issues</h2>
        <p>Follow the issues you’ve sent for review</p>
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
