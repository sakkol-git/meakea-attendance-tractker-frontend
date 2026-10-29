<script setup lang="ts">
const session = useSessionStore()
const api = useWorkspace()
const leaves = useWorkspaceQuery('pending-leave-home', () => api.list('pendingLeaves'))
const requests = useWorkspaceQuery('pending-requests-home', () =>
  session.canReviewRequests
    ? api.list('pendingRequests')
    : Promise.resolve({ items: [], total: 0 }),
)
const corrections = useWorkspaceQuery('pending-corrections-home', () => api.list('corrections'))
const failed = computed(() => leaves.error.value || requests.error.value || corrections.error.value)
const pending = computed(
  () => leaves.isPending.value || requests.isPending.value || corrections.isPending.value,
)
const total = computed(
  () =>
    (leaves.data.value?.total ?? 0) +
    (requests.data.value?.total ?? 0) +
    (corrections.data.value?.items.filter((row) => row.status === 'PENDING').length ?? 0),
)
const title = computed(() =>
  session.roles.includes('HR_ADMIN')
    ? 'HR workspace'
    : session.roles.includes('OWNER')
      ? 'Organization workspace'
      : 'Team workspace',
)
async function retry() {
  await Promise.allSettled([leaves.refetch(), requests.refetch(), corrections.refetch()])
}
</script>
<template>
  <section class="panel role-workspace" aria-labelledby="role-workspace-title">
    <div class="section-heading">
      <div>
        <h2 id="role-workspace-title">{{ title }}</h2>
        <p>
          {{
            session.isAdmin
              ? 'Review outstanding decisions and manage organization records.'
              : 'Review your team’s requests and attendance.'
          }}
        </p>
      </div>
      <NuxtLink to="/approvals" class="text-link"
        >Review approvals<AppIcon name="arrow-right"
      /></NuxtLink>
    </div>
    <p v-if="pending" role="status">Loading current approvals…</p>
    <div v-else-if="failed" class="inline-actions" role="status">
      <p>Some approval counts are unavailable. Open the queue or try again.</p>
      <PButton label="Retry counts" text @click="retry" />
    </div>
    <p v-else role="status">
      <strong>{{ total }}</strong> {{ total === 1 ? 'item needs' : 'items need' }} review across the
      loaded queues.
    </p>
    <div class="role-shortcuts">
      <NuxtLink to="/people" class="text-link">People directory<AppIcon name="users" /></NuxtLink>
      <NuxtLink v-if="session.roles.includes('HR_ADMIN')" to="/workflows/BF-020" class="text-link"
        >Leave and attendance conflicts<AppIcon name="calendar"
      /></NuxtLink>
      <NuxtLink v-if="session.isAdmin" to="/organization" class="text-link"
        >Organization settings<AppIcon name="building"
      /></NuxtLink>
      <NuxtLink to="/reports" class="text-link">Reports<AppIcon name="chart-bar" /></NuxtLink>
      <NuxtLink v-if="session.roles.includes('OWNER')" to="/audit" class="text-link"
        >Audit activity<AppIcon name="history"
      /></NuxtLink>
    </div>
  </section>
</template>
