<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
definePageMeta({ roles: ['MANAGER', 'HR_ADMIN', 'OWNER'] })
const api = useWorkspace()
const session = useSessionStore()
const selected = ref('Time off')
const leave = useWorkspaceQuery('pending-leave', () => api.list('pendingLeaves'))
const requests = useWorkspaceQuery('pending-requests', () => api.list('pendingRequests'))
const corrections = useWorkspaceQuery('pending-corrections', () => api.list('corrections'))
const feedback = useFeedback()
const confirm = useConfirm()
const decision = ref<{ id: string; version: number }>()
const reason = ref('')
const reasonError = ref('')
function correction(id: string, version: number, action: string) {
  if (action === 'reject') {
    decision.value = { id, version }
    reason.value = ''
    reasonError.value = ''
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
async function rejectIssue() {
  if (reason.value.trim().length < 5) {
    reasonError.value = 'Give a reason in at least five characters.'
    return
  }
  const row = decision.value!
  const result = await feedback.run(
    () => api.change('corrections', row.id, 'reject', row.version, { reason: reason.value.trim() }),
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
  />
  <div class="segmented-tabs" role="group" aria-label="Approval category">
    <button
      v-for="tab in ['Time off', 'Requests', 'Attendance issues']"
      :key="tab"
      :class="{ selected: selected === tab }"
      :aria-pressed="selected === tab"
      @click="selected = tab"
    >
      {{ tab }}<span v-if="tab === 'Time off'">{{ leave.data.value?.total ?? '—' }}</span
      ><span v-if="tab === 'Requests'">{{ requests.data.value?.total ?? '—' }}</span>
    </button>
  </div>
  <section v-if="selected === 'Time off'" class="panel no-padding">
    <QueryState
      :pending="leave.isPending.value"
      :error="leave.error.value"
      :empty="!leave.data.value?.items.length"
      title="You’re all caught up"
      message="No time-off requests need your review."
      @retry="leave.refetch()"
      ><RequestTable :rows="leave.data.value?.items || []" kind="leave"
    /></QueryState>
  </section>
  <section v-else-if="selected === 'Requests'" class="panel no-padding">
    <QueryState
      :pending="requests.isPending.value"
      :error="requests.error.value"
      :empty="!requests.data.value?.items.length"
      title="A clear inbox"
      message="New requests will appear here when they need a decision."
      @retry="requests.refetch()"
      ><RequestTable :rows="requests.data.value?.items || []" kind="request"
    /></QueryState>
  </section>
  <section v-else class="panel">
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
  <PDialog
    :visible="!!decision"
    modal
    header="Reject attendance issue"
    :style="{ width: '30rem' }"
    @update:visible="decision = undefined"
    ><form class="app-form" @submit.prevent="rejectIssue">
      <div class="field">
        <label for="issue-reason">Decision reason</label
        ><PTextarea
          id="issue-reason"
          v-model="reason"
          rows="4"
          :aria-invalid="!!reasonError"
        /><small class="field-error">{{ reasonError }}</small>
      </div>
      <PButton
        label="Reject issue"
        type="submit"
        severity="danger"
        :loading="feedback.busy.value"
      /></form
  ></PDialog>
</template>
