<script setup lang="ts">
import type { EntityRow } from '~/types/workspace'
import { approvalAgeDays, approvalExceptions } from '~/utils/approval'
import { dateLabel, initials } from '~/utils/format'

const props = defineProps<{ rows: EntityRow[]; kind: 'leave' | 'request' | 'correction' }>()
const target = (row: EntityRow, index: number) => {
  const next = props.rows[index + 1]
  const query = new URLSearchParams({ from: 'approvals' })
  if (next) query.set('next', next.id)
  return props.kind === 'request'
    ? `/requests/${row.id}?${query}`
    : props.kind === 'leave'
      ? `/leave/${row.id}?${query}`
      : `/attendance?correction=${row.id}&${query}`
}
</script>

<template>
  <PDataTable
    :value="rows"
    data-key="id"
    class="workspace-table"
    :row-hover="true"
    :pt="{ tableContainer: { role: 'region', 'aria-label': 'Approval queue', tabindex: 0 } }"
  >
    <PColumn header="Request">
      <template #body="{ data, index }">
        <NuxtLink :to="target(data, index)" class="table-title">
          <span class="record-icon" :class="kind">
            <AppIcon
              :name="kind === 'leave' ? 'sun' : kind === 'correction' ? 'clock' : 'briefcase'"
            />
          </span>
          <span>
            <strong>{{ data.title || data.type || 'Attendance correction' }}</strong>
            <small v-if="kind === 'leave'">
              {{ dateLabel(data.startDate, 'MMM d') }} – {{ dateLabel(data.endDate, 'MMM d') }}
            </small>
            <small v-else>{{ data.reason || 'Review the submitted details' }}</small>
          </span>
        </NuxtLink>
      </template>
    </PColumn>
    <PColumn header="Requested by" class="mobile-hidden">
      <template #body="{ data }">
        <span class="person-cell">
          <span class="avatar avatar-small">{{ initials(data.employeeName || 'Employee') }}</span>
          {{ data.employeeName || 'Employee' }}
        </span>
      </template>
    </PColumn>
    <PColumn header="Waiting" class="mobile-waiting">
      <template #body="{ data }">
        <span class="status-badge">{{ approvalAgeDays(data) }} days</span>
      </template>
    </PColumn>
    <PColumn header="Policy" class="mobile-hidden">
      <template #body="{ data }">
        <span v-if="approvalExceptions(data).length" class="status-badge status-warning">
          {{ approvalExceptions(data).join(', ') }}
        </span>
        <span v-else class="subtle">No exception</span>
      </template>
    </PColumn>
    <PColumn header="Status" class="mobile-status">
      <template #body="{ data }"><StatusBadge :status="data.status" /></template>
    </PColumn>
    <PColumn header="Details" class="table-action mobile-hidden">
      <template #body="{ data, index }">
        <NuxtLink
          :to="target(data, index)"
          class="view-link"
          :aria-label="`View ${data.title || data.type || 'request'}`"
        >
          <AppIcon name="arrow-up-right" />
        </NuxtLink>
      </template>
    </PColumn>
  </PDataTable>
</template>
