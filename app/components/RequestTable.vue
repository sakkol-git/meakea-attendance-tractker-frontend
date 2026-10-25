<script setup lang="ts">
import type { EntityRow } from '~/types/workspace'
import { dateLabel, statusLabel, initials } from '~/utils/format'
const props = defineProps<{
  rows: EntityRow[]
  kind: 'leave' | 'request' | 'correction'
  compact?: boolean
}>()
const query = ref('')
const status = ref('All statuses')
const filtered = computed(() =>
  props.rows.filter(
    (row) =>
      (status.value === 'All statuses' || row.status === status.value) &&
      [row.title, row.type, row.reason, row.employeeName]
        .join(' ')
        .toLowerCase()
        .includes(query.value.toLowerCase()),
  ),
)
const statuses = computed(() => [
  'All statuses',
  ...new Set(props.rows.map((x) => x.status).filter(Boolean)),
])
const target = (row: EntityRow) =>
  props.kind === 'request'
    ? `/requests/${row.id}`
    : props.kind === 'leave'
      ? `/leave/${row.id}`
      : `/attendance?correction=${row.id}`
</script>
<template>
  <div v-if="!compact" class="table-toolbar">
    <div class="search-field">
      <AppIcon name="search" /><PInputText
        v-model="query"
        :placeholder="kind === 'leave' ? 'Search time off…' : 'Search requests…'"
        aria-label="Search records"
      />
    </div>
    <PSelect v-model="status" :options="statuses" aria-label="Filter status"
      ><template #value>{{ status === 'All statuses' ? status : statusLabel(status) }}</template
      ><template #option="slotProps">{{ statusLabel(slotProps.option) }}</template></PSelect
    ><span class="record-count">{{ filtered.length }} records</span>
  </div>
  <PDataTable
    :value="filtered"
    :paginator="!compact && filtered.length > 8"
    :rows="8"
    data-key="id"
    class="workspace-table"
    :row-hover="true"
    :pt="{ tableContainer: { role: 'region', 'aria-label': 'Requests table', tabindex: 0 } }"
  >
    <PColumn :header="kind === 'leave' ? 'Time off' : 'Request'" field="type"
      ><template #body="{ data }"
        ><NuxtLink :to="target(data)" class="table-title"
          ><span class="record-icon" :class="kind"
            ><AppIcon
              :name="
                kind === 'leave' ? 'sun' : kind === 'correction' ? 'clock' : 'briefcase'
              " /></span
          ><span
            ><strong>{{ data.title || data.type || 'Attendance issue' }}</strong
            ><small>{{
              kind === 'leave'
                ? `${dateLabel(data.startDate, 'MMM d')} – ${dateLabel(data.endDate, 'MMM d')}`
                : data.reason
            }}</small></span
          ></NuxtLink
        ></template
      ></PColumn
    >
    <PColumn v-if="!compact" header="Requested by"
      ><template #body="{ data }"
        ><span class="person-cell"
          ><span class="avatar avatar-small">{{ initials(data.employeeName || 'You') }}</span
          >{{ data.employeeName || 'You' }}</span
        ></template
      ></PColumn
    >
    <PColumn v-if="kind === 'leave'" header="Duration"
      ><template #body="{ data }"
        >{{ data.days ?? '—' }} {{ data.days === 1 ? 'day' : 'days' }}</template
      ></PColumn
    >
    <PColumn header="Status"
      ><template #body="{ data }"><StatusBadge :status="data.status" /></template
    ></PColumn>
    <PColumn header="Details" class="table-action"
      ><template #body="{ data }"
        ><NuxtLink
          :to="target(data)"
          class="view-link"
          :aria-label="`View ${data.title || data.type || 'request'}`"
          ><AppIcon name="arrow-up-right" /></NuxtLink></template
    ></PColumn>
    <template #empty><div class="table-empty">No records match your filters.</div></template>
  </PDataTable>
</template>
