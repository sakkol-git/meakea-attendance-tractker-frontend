<script setup lang="ts">
definePageMeta({ roles: ['OWNER'] })

const api = useWorkspace()
const session = useSessionStore()
const page = ref(0)
const size = 25
const actor = ref('')
const action = ref('')
const target = ref('')
const from = ref('')
const to = ref('')
const invalidRange = computed(() => Boolean(from.value && to.value && to.value < from.value))
const query = computed(() => ({
  page: page.value,
  size,
  actor: actor.value.trim(),
  action: action.value.trim(),
  target: target.value.trim(),
  from: from.value,
  to: to.value,
}))
const result = useWorkspaceQuery(
  computed(() => `audit:${JSON.stringify(query.value)}`),
  () => api.auditLogs(query.value),
)

watch([actor, action, target, from, to], () => {
  page.value = 0
})

function clearFilters() {
  actor.value = ''
  action.value = ''
  target.value = ''
  from.value = ''
  to.value = ''
}

function auditTime(value: string) {
  try {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: session.profile?.timeZone || 'UTC',
    }).format(new Date(value))
  } catch {
    return value
  }
}
</script>

<template>
  <PageHeading
    title="Audit activity"
    description="Review security-sensitive activity without exposing private credentials."
    eyebrow="ACCOUNTABILITY"
  />

  <p v-if="session.mode === 'local'" class="info-banner">
    <AppIcon name="info-circle" />Synthetic audit examples. Remote mode reads identity-owned audit
    activity; audit records from other services are outside this view.
  </p>

  <section class="panel no-padding">
    <p class="audit-timezone small-note">
      Activity times are shown in {{ session.profile?.timeZone || 'UTC' }}.
    </p>
    <div class="table-toolbar audit-toolbar">
      <h2>
        Activity
        <span class="count-badge">{{
          invalidRange || result.isPending.value || result.error.value
            ? '—'
            : (result.data.value?.total ?? '—')
        }}</span>
      </h2>
      <PButton
        label="Clear filters"
        icon="pi pi-filter-slash"
        text
        :disabled="!actor && !action && !target && !from && !to"
        @click="clearFilters"
      />
    </div>
    <form class="audit-filters" aria-label="Audit filters" @submit.prevent>
      <label>
        <span>Actor</span>
        <PInputText
          v-model="actor"
          placeholder="Account ID"
          autocapitalize="none"
          :spellcheck="false"
        />
      </label>
      <label>
        <span>Action</span>
        <PInputText v-model="action" placeholder="For example, approved" />
      </label>
      <label>
        <span>Target</span>
        <PInputText
          v-model="target"
          placeholder="Record ID"
          autocapitalize="none"
          :spellcheck="false"
        />
      </label>
      <label>
        <span>From</span>
        <input v-model="from" class="p-inputtext" type="date" />
      </label>
      <label>
        <span>To</span>
        <input
          v-model="to"
          class="p-inputtext"
          type="date"
          :min="from || undefined"
          :aria-invalid="invalidRange"
          aria-describedby="audit-date-error"
        />
      </label>
    </form>
    <p v-if="invalidRange" id="audit-date-error" class="form-error" role="alert">
      To date must be on or after From date.
    </p>

    <QueryState
      v-if="!invalidRange"
      :pending="result.isPending.value"
      :error="result.error.value"
      :empty="!result.data.value?.items.length"
      title="No audit activity matches"
      message="Clear one or more filters and try again."
      @retry="result.refetch()"
    >
      <div class="table-region" role="region" aria-label="Audit activity" tabindex="0">
        <PDataTable :value="result.data.value?.items || []" data-key="id">
          <PColumn header="When">
            <template #body="{ data }">
              <time :datetime="data.at">{{ auditTime(data.at) }}</time>
            </template>
          </PColumn>
          <PColumn field="actor" header="Actor" />
          <PColumn field="action" header="Action">
            <template #body="{ data }"><StatusBadge :status="data.action" /></template>
          </PColumn>
          <PColumn field="entityId" header="Target">
            <template #body="{ data }"
              ><code>{{ data.entityId }}</code></template
            >
          </PColumn>
          <PColumn header="Reason">
            <template #body="{ data }">{{ data.reason || 'Not recorded' }}</template>
          </PColumn>
          <template #empty>No audit activity matches these filters.</template>
        </PDataTable>
      </div>
      <CollectionPager
        :page="result.data.value?.page || 0"
        :size="result.data.value?.size || size"
        :total="result.data.value?.total || 0"
        @update:page="page = $event"
      />
    </QueryState>
  </section>
</template>

<style scoped>
.audit-timezone {
  padding: var(--space-4) var(--space-6) 0;
}
</style>
