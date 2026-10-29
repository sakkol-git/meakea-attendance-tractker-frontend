<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
definePageMeta({ roles: ['MANAGER', 'HR_ADMIN', 'OWNER'] })
const api = useWorkspace()
const session = useSessionStore()
const selected = ref('Leave')
const searchInput = ref('')
const search = ref('')
const status = ref('PENDING')
const sort = ref<'oldest' | 'newest'>('oldest')
const minAgeDays = ref(0)
const page = ref(0)
const pageSize = 25
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (search.value = value.trim()), 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))
const queueKey = computed(() => `${search.value}:${status.value}:${sort.value}:${minAgeDays.value}`)
watch([search, status, sort, minAgeDays, selected], () => (page.value = 0))
const queueOptions = computed(() => ({
  page: page.value,
  size: pageSize,
  search: search.value,
  status: status.value,
  sort: sort.value,
  minAgeDays: minAgeDays.value,
}))
const leave = useWorkspaceQuery(
  computed(() => `pending-leave:${queueKey.value}:${page.value}`),
  () => api.list('pendingLeaves', queueOptions.value),
)
const requests = useWorkspaceQuery(
  computed(() => `pending-requests:${queueKey.value}:${page.value}`),
  () =>
    session.canReviewRequests
      ? api.list('pendingRequests', queueOptions.value)
      : Promise.resolve({ items: [], total: 0 }),
)
const corrections = useWorkspaceQuery(
  computed(() => `pending-corrections:${queueKey.value}:${page.value}`),
  () => api.list('corrections', queueOptions.value),
)
const feedback = useFeedback()
const confirm = useConfirm()
const decision = ref<{ id: string; version: number }>()
function correction(id: string, version: number, action: string) {
  if (action === 'reject') {
    decision.value = { id, version }
    return
  }
  confirm.require({
    header: 'Approve this attendance issue?',
    message:
      'Review the original record and reported issue before deciding. Corrections must remain auditable in the server.',
    acceptLabel: 'Approve',
    rejectLabel: 'Go back',
    accept: () =>
      feedback.run(() => api.change('corrections', id, action, version), 'Issue approved'),
  })
}
async function rejectIssue(reasonText: string) {
  const row = decision.value!
  const result = await feedback.run(
    () => api.change('corrections', row.id, 'reject', row.version, { reason: reasonText }),
    'Issue rejected',
  )
  if (result) decision.value = undefined
}
</script>
<template>
  <PageHeading
    title="Approvals"
    description="A little clarity helps everyone move forward."
    eyebrow="YOUR TEAM IS COUNTING ON YOU"
  >
    <NuxtLink to="/delegations">
      <PButton label="Manage delegation" icon="pi pi-users" outlined />
    </NuxtLink>
  </PageHeading>
  <ApprovalFilters
    v-model:search="searchInput"
    v-model:status="status"
    v-model:sort="sort"
    v-model:min-age-days="minAgeDays"
  />
  <div class="segmented-tabs" role="group" aria-label="Approval category">
    <button
      v-for="tab in [
        'Leave',
        ...(session.canReviewRequests ? ['Requests'] : []),
        'Attendance issues',
      ]"
      :key="tab"
      :class="{ selected: selected === tab }"
      :aria-pressed="selected === tab"
      @click="selected = tab"
    >
      {{ tab }}<span v-if="tab === 'Leave'">{{ leave.data.value?.total ?? '—' }}</span
      ><span v-if="tab === 'Requests'">{{ requests.data.value?.total ?? '—' }}</span
      ><span v-if="tab === 'Attendance issues'">{{ corrections.data.value?.total ?? '—' }}</span>
    </button>
  </div>
  <section v-if="selected === 'Leave'" class="panel no-padding">
    <QueryState
      :pending="leave.isPending.value"
      :error="leave.error.value"
      :empty="!leave.data.value?.items.length"
      title="You’re all caught up"
      message="No leave requests need your review."
      @retry="leave.refetch()"
      ><ApprovalTable :rows="leave.data.value?.items || []" kind="leave"
    /></QueryState>
  </section>
  <CollectionPager
    v-if="selected === 'Leave'"
    v-model:page="page"
    :size="pageSize"
    :total="leave.data.value?.total ?? 0"
  />
  <section v-if="selected === 'Requests'" class="panel no-padding">
    <QueryState
      :pending="requests.isPending.value"
      :error="requests.error.value"
      :empty="!requests.data.value?.items.length"
      title="A clear inbox"
      message="New requests will appear here when they need a decision."
      @retry="requests.refetch()"
      ><ApprovalTable :rows="requests.data.value?.items || []" kind="request"
    /></QueryState>
  </section>
  <CollectionPager
    v-if="selected === 'Requests'"
    v-model:page="page"
    :size="pageSize"
    :total="requests.data.value?.total ?? 0"
  />
  <section v-if="selected === 'Attendance issues'" class="panel">
    <QueryState
      :pending="corrections.isPending.value"
      :error="corrections.error.value"
      :empty="!corrections.data.value?.items.filter((x) => x.status === 'PENDING').length"
      title="No issues to review"
      @retry="corrections.refetch()"
      ><div
        v-for="row in corrections.data.value?.items.filter((x) => x.status === 'PENDING')"
        :key="row.id"
        class="issue-row"
      >
        <div>
          <strong>{{ row.date }}</strong>
          <p>{{ row.reason }}</p>
        </div>
        <div class="inline-actions">
          <PButton
            label="Approve"
            :loading="feedback.busy.value"
            @click="correction(row.id, row.version, 'approve')"
          /><PButton
            label="Reject"
            outlined
            severity="danger"
            :disabled="feedback.busy.value"
            @click="correction(row.id, row.version, 'reject')"
          />
        </div></div
    ></QueryState>
  </section>
  <CollectionPager
    v-if="selected === 'Attendance issues'"
    v-model:page="page"
    :size="pageSize"
    :total="corrections.data.value?.total ?? 0"
  />
  <DecisionReasonDialog
    :visible="!!decision"
    action="reject"
    title="Reject attendance issue"
    label="Decision reason"
    submit-label="Reject issue"
    :loading="feedback.busy.value"
    @update:visible="decision = undefined"
    @confirm="rejectIssue"
  />
</template>
