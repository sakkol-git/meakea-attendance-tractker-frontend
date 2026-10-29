<script setup lang="ts">
import type { AttendanceRow } from '~/types/workspace'
import { clockLabel, duration, tenantDay, dateLabel } from '~/utils/format'
const props = defineProps<{ rows: AttendanceRow[]; timeZone?: string }>()
const limit = ref(8)
watch(
  () => props.rows,
  () => {
    limit.value = 8
  },
)
</script>
<template>
  <div class="attendance-session-cards" aria-label="Attendance sessions">
    <article v-for="row in rows.slice(0, limit)" :key="row.id" class="attendance-session-card">
      <header>
        <strong>{{ dateLabel(tenantDay(row.clockIn, timeZone)) }}</strong
        ><StatusBadge :status="row.clockOut ? 'COMPLETED' : 'ACTIVE'" />
      </header>
      <dl>
        <div>
          <dt>Clock in</dt>
          <dd>{{ clockLabel(row.clockIn, timeZone) }}</dd>
        </div>
        <div>
          <dt>Clock out</dt>
          <dd>{{ clockLabel(row.clockOut, timeZone) }}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{{ duration(row.clockIn, row.clockOut) }}</dd>
        </div>
      </dl>
    </article>
    <PButton v-if="rows.length > limit" label="Show more sessions" outlined @click="limit += 8" />
  </div>
  <div class="attendance-session-table">
    <PDataTable
      :value="rows"
      :paginator="rows.length > 8"
      :rows="8"
      :pt="{ tableContainer: { role: 'region', 'aria-label': 'Attendance sessions', tabindex: 0 } }"
    >
      <PColumn header="Date"
        ><template #body="{ data }"
          ><strong>{{ tenantDay(data.clockIn, timeZone) }}</strong></template
        ></PColumn
      >
      <PColumn header="Clock in"
        ><template #body="{ data }">{{ clockLabel(data.clockIn, timeZone) }}</template></PColumn
      >
      <PColumn header="Clock out"
        ><template #body="{ data }">{{ clockLabel(data.clockOut, timeZone) }}</template></PColumn
      >
      <PColumn header="Duration"
        ><template #body="{ data }">{{ duration(data.clockIn, data.clockOut) }}</template></PColumn
      >
      <PColumn header="Recorded state"
        ><template #body="{ data }"
          ><StatusBadge :status="data.clockOut ? 'COMPLETED' : 'ACTIVE'" /></template
      ></PColumn>
    </PDataTable>
  </div>
</template>
