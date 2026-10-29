<script setup lang="ts">
const api = useWorkspace()
const feedback = useFeedback()
const result = useWorkspaceQuery('live-attendance-report', () => api.attendanceReport())
const time = (value: string | null, zone: string | null) =>
  value && zone
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—'
</script>

<template>
  <PageHeading
    title="Attendance records"
    description="Recorded sessions and approved time corrections."
    eyebrow="REPORTS"
  >
    <PButton
      label="Export attendance CSV"
      icon="pi pi-download"
      outlined
      :loading="feedback.busy.value"
      @click="feedback.run(() => api.downloadAttendanceReport())"
    />
  </PageHeading>
  <p class="info-banner">
    These records show recorded work. Final daily absence, holiday and leave summaries are not
    available yet.
  </p>
  <p v-if="feedback.error.value" class="form-error" role="alert">{{ feedback.error.value }}</p>
  <QueryState
    :pending="result.isPending.value"
    :error="result.error.value"
    @retry="result.refetch()"
  >
    <section v-if="result.data.value" class="panel">
      <h2>{{ result.data.value.totalCount }} recorded sessions</h2>
      <p v-if="!result.data.value.records.length">No recorded sessions are available.</p>
      <div v-else style="overflow-x: auto">
        <table>
          <caption class="sr-only">
            Attendance sessions in their assigned time zone
          </caption>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Work date</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Time zone</th>
              <th>Status</th>
              <th>Worked minutes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in result.data.value.records" :key="row.sessionId">
              <td>{{ row.employeeId }}</td>
              <td>{{ row.workDate }}</td>
              <td>{{ time(row.clockIn, row.timezone) }}</td>
              <td>{{ time(row.clockOut, row.timezone) }}</td>
              <td>{{ row.timezone ?? 'Unavailable' }}</td>
              <td>
                {{
                  row.status === 'OPEN'
                    ? 'Open'
                    : row.status === 'COMPLETED'
                      ? 'Completed'
                      : row.status
                }}
              </td>
              <td>{{ row.clockIn ? (row.minutesWorked ?? 'In progress') : 'Unavailable' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </QueryState>
</template>
