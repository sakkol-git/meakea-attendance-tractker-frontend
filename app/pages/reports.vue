<script setup lang="ts">
import { dateLabel } from '~/utils/format'
import type { ExportJob } from '~/schemas/contracts'
import type { z } from 'zod'

definePageMeta({ roles: ['MANAGER', 'HR_ADMIN', 'OWNER'] })

const api = useWorkspace()
const session = useSessionStore()
const feedback = useFeedback()
const config = useRuntimeConfig()

const period = ref('this-month')
const periodOptions = [
  { label: 'This month', value: 'this-month' },
  { label: 'Last month', value: 'last-month' },
  { label: 'This quarter', value: 'this-quarter' },
  { label: 'Year to date', value: 'ytd' },
]

const result = useWorkspaceQuery('reports', () =>
  session.mode === 'local' ? api.report() : Promise.resolve(null),
)
const job = ref<z.infer<typeof ExportJob>>()

const leaveColors = ['#006151', '#6483a8', '#b28c59', '#8c7eac', '#6b864a']
const leaveChartData = computed(() =>
  (result.data.value?.leaveByType || []).map((x, i) => ({
    label: x.label,
    value: x.value,
    color: leaveColors[i % leaveColors.length],
  })),
)

const attendanceRate = computed(() => {
  const list = result.data.value?.attendance || []
  const recorded = list.reduce((s, x) => s + x.recorded, 0)
  const expected = list.reduce((s, x) => s + x.expected, 0)
  return expected > 0 ? Math.round((recorded / expected) * 1000) / 10 : 100
})

const attendanceBreakdown = computed(() => {
  const list = result.data.value?.attendance || []
  const recorded = list.reduce((s, x) => s + x.recorded, 0)
  const expected = list.reduce((s, x) => s + x.expected, 0)
  const onLeave = Math.round(expected * 0.05)
  const absent = Math.max(0, expected - recorded - onLeave)
  return [
    { label: 'Present', value: recorded, color: '#10b981' },
    { label: 'On leave', value: onLeave, color: '#6366f1' },
    { label: 'Absent', value: absent, color: '#f43f5e' },
  ]
})

async function download() {
  const fileOrigins = String(config.public.fileOrigins)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const res = await feedback.run(() =>
    api.downloadLeaveReport(config.public.apiBaseUrl, window.location.origin, fileOrigins),
  )
  if (res) job.value = res
}
</script>

<template>
  <RemoteAttendanceReport v-if="session.mode === 'remote'" />
  <template v-else>
    <PageHeading
      title="A clearer picture"
      description="Thoughtful insights for a healthier workplace."
      eyebrow="REPORTS & INSIGHTS"
    >
      <div class="heading-actions">
        <NuxtLink v-if="session.isAdmin" to="/workflows/BF-031">
          <PButton label="Rebuild projections" icon="pi pi-database" outlined />
        </NuxtLink>
        <PSelect
          v-model="period"
          :options="periodOptions"
          option-label="label"
          option-value="value"
          aria-label="Report period"
        />
        <PButton
          label="Export leave CSV"
          icon="pi pi-download"
          outlined
          :loading="feedback.busy.value"
          @click="download"
        />
      </div>
    </PageHeading>

    <p v-if="session.mode === 'local'" class="info-banner">
      <AppIcon name="info-circle" />Illustrative demo metrics. These figures are synthetic and are
      not payroll or compliance records.
    </p>

    <p v-if="job && job.status !== 'COMPLETED'" role="status" class="info-banner">
      Export {{ job.status.toLowerCase() }}.
      {{
        ['FAILED', 'CANCELLED'].includes(job.status)
          ? 'The export failed. Review the error and retry only when safe.'
          : 'Your export is not ready. Check again later.'
      }}
    </p>

    <p v-if="feedback.error.value" role="alert" class="form-error">
      {{ feedback.error.value }}
    </p>

    <QueryState
      :pending="result.isPending.value"
      :error="result.error.value"
      @retry="result.refetch()"
    >
      <template v-if="result.data.value">
        <div class="metric-grid">
          <section class="panel metric-card">
            <span class="record-icon blue"><AppIcon name="users" /></span>
            <p>People in your workspace</p>
            <strong>{{ result.data.value.teamSize }}</strong>
          </section>
          <section class="panel metric-card">
            <span class="record-icon emerald"><AppIcon name="clock" /></span>
            <p>Average attendance rate</p>
            <strong>{{ attendanceRate }}%</strong>
          </section>
          <section class="panel metric-card">
            <span class="record-icon peach"><AppIcon name="check-square" /></span>
            <p>Waiting for a decision</p>
            <strong>{{ result.data.value.pendingApprovals }}</strong>
            <NuxtLink to="/approvals" class="text-link">
              Review inbox<AppIcon name="arrow-right" />
            </NuxtLink>
          </section>
          <section class="panel metric-card">
            <span class="record-icon leave"><AppIcon name="refresh" /></span>
            <p>Data updated</p>
            <strong class="date-metric">
              {{ dateLabel(result.data.value.dataAsOf, 'MMM d, h:mm a') }}
            </strong>
          </section>
        </div>

        <div class="detail-grid">
          <!-- Workday Attendance Daily Chart -->
          <section class="panel">
            <div class="section-heading">
              <div>
                <h2>Workday attendance</h2>
                <p>Recorded sessions compared with expected people</p>
              </div>
              <span class="chart-legend"><i />Recorded</span>
            </div>
            <div
              class="bar-chart"
              role="img"
              aria-label="Attendance by day; exact values are in the table below"
            >
              <div v-for="day in result.data.value.attendance" :key="day.label" class="bar-column">
                <strong>{{ day.recorded }}/{{ day.expected }}</strong>
                <div class="bar-track">
                  <span
                    :style="{
                      height: `${day.expected ? Math.min(100, (day.recorded / day.expected) * 100) : 0}%`,
                    }"
                  />
                </div>
                <small>{{ day.label }}</small>
              </div>
            </div>
            <table class="sr-only">
              <caption>
                Attendance counts
              </caption>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Recorded</th>
                  <th>Expected</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="day in result.data.value.attendance" :key="day.label">
                  <th>{{ day.label }}</th>
                  <td>{{ day.recorded }}</td>
                  <td>{{ day.expected }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Time off breakdown Donut & Progress bars -->
          <section class="panel">
            <div class="section-heading">
              <div>
                <h2>Leave distribution</h2>
                <p>Absence allocation by approved category</p>
              </div>
              <AppIcon name="sun" />
            </div>

            <div class="donut-container">
              <DonutChart
                :data="leaveChartData"
                center-label="Total days"
                unit="days"
                title="Leave distribution"
              />
            </div>

            <p class="small-note">
              Use these summaries to start a conversation. Always verify source records before
              making a decision.
            </p>
          </section>
        </div>
      </template>
    </QueryState>
  </template>
</template>
