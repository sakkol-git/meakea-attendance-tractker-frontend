<script setup lang="ts">
import { dateLabel } from '~/utils/format'
import type { ExportJob } from '~/schemas/contracts'
import type { z } from 'zod'
definePageMeta({ roles: ['MANAGER', 'HR_ADMIN', 'OWNER'] })
const api = useWorkspace()
const session = useSessionStore()
const feedback = useFeedback()
const config = useRuntimeConfig()
const result = useWorkspaceQuery('reports', () => api.report())
const job = ref<z.infer<typeof ExportJob>>()
async function download() {
  const result = await feedback.run(() =>
    api.downloadLeaveReport(config.public.apiBaseUrl, window.location.origin),
  )
  if (result) job.value = result
}
</script>
<template>
  <PageHeading
    title="A clearer picture"
    description="Thoughtful insights for a healthier workplace."
    eyebrow="REPORTS & INSIGHTS"
    ><PButton
      label="Export leave CSV"
      icon="pi pi-download"
      outlined
      :loading="feedback.busy.value"
      @click="download"
  /></PageHeading>
  <p v-if="session.mode === 'local'" class="info-banner">
    <AppIcon name="info-circle" />Illustrative demo metrics. These figures are synthetic and are not
    payroll or compliance records.
  </p>
  <p v-if="job && job.status !== 'COMPLETED'" role="status" class="info-banner">
    Export {{ job.status.toLowerCase() }}.
    {{
      job.status === 'FAILED'
        ? 'The export failed. Review the error and retry only when safe.'
        : 'Your export is not ready. Background-job polling requires the reporting service contract.'
    }}
  </p>
  <p v-if="feedback.error.value" role="alert" class="form-error">{{ feedback.error.value }}</p>
  <QueryState
    :pending="result.isPending.value"
    :error="result.error.value"
    @retry="result.refetch()"
    ><template v-if="result.data.value"
      ><div class="metric-grid">
        <section class="panel metric-card">
          <span class="record-icon blue"><AppIcon name="users" /></span>
          <p>People in your workspace</p>
          <strong>{{ result.data.value.teamSize }}</strong>
        </section>
        <section class="panel metric-card">
          <span class="record-icon peach"><AppIcon name="check-square" /></span>
          <p>Waiting for a decision</p>
          <strong>{{ result.data.value.pendingApprovals }}</strong
          ><NuxtLink to="/approvals" class="text-link"
            >Review inbox<AppIcon name="arrow-right"
          /></NuxtLink>
        </section>
        <section class="panel metric-card">
          <span class="record-icon leave"><AppIcon name="refresh" /></span>
          <p>Data updated</p>
          <strong class="date-metric">{{
            dateLabel(result.data.value.dataAsOf, 'MMM d, h:mm a')
          }}</strong>
        </section>
      </div>
      <div class="detail-grid">
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
        <section class="panel">
          <div class="section-heading">
            <h2>Time off, by type</h2>
            <AppIcon name="sun" />
          </div>
          <div
            v-for="item in result.data.value.leaveByType"
            :key="item.label"
            class="report-category"
          >
            <div>
              <strong>{{ item.label }}</strong
              ><span>{{ item.value }} days</span>
            </div>
            <div class="balance-track">
              <span
                :style="{
                  width: `${(item.value / Math.max(1, ...result.data.value.leaveByType.map((x) => x.value))) * 100}%`,
                }"
              />
            </div>
          </div>
          <p class="small-note">
            Use these summaries to start a conversation. Always verify source records before making
            a decision.
          </p>
        </section>
      </div></template
    ></QueryState
  >
</template>
