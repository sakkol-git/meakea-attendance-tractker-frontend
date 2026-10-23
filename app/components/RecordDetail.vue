<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
import { dateLabel, titleCase } from '~/utils/format'
const props = defineProps<{ kind: 'leave' | 'request'; id: string }>()
const api = useWorkspace()
const session = useSessionStore()
const feedback = useFeedback()
const confirm = useConfirm()
const path = props.kind === 'leave' ? 'leaves' : 'requests'
const result = useWorkspaceQuery(`detail-${path}-${props.id}`, () => api.detail(path, props.id))
const row = computed(() => result.data.value?.row)
const reasonDialog = ref(false)
const reason = ref('')
const reasonError = ref('')
const isOwn = computed(() => row.value?.employeeId === session.profile?.employeeId)
async function perform(action: string, note?: string) {
  if (!row.value) return
  const response = await feedback.run(
    () =>
      api.change(path, props.id, action, row.value!.version, note ? { reason: note } : undefined),
    `Request ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'fulfill' ? 'fulfilled' : 'cancelled'}`,
  )
  if (response) reasonDialog.value = false
}
function requestAction(action: string) {
  confirm.require({
    header: `${titleCase(action)} this request?`,
    message:
      action === 'cancel'
        ? 'This will withdraw the request. Review its details before continuing.'
        : 'This decision will update the request and notify the requester when supported by your workspace.',
    acceptLabel: titleCase(action),
    rejectLabel: 'Go back',
    acceptProps: { severity: action === 'cancel' ? 'danger' : 'primary' },
    accept: () => perform(action),
  })
}
function reject() {
  if (reason.value.trim().length < 5) {
    reasonError.value = 'Add a reason in at least five characters.'
    return
  }
  perform('reject', reason.value.trim())
}
</script>
<template>
  <NuxtLink :to="`/${kind === 'leave' ? 'leave' : 'requests'}`" class="back-link"
    ><AppIcon name="arrow-left" />Back to {{ kind === 'leave' ? 'time off' : 'requests' }}</NuxtLink
  >
  <QueryState
    :pending="result.isPending.value"
    :error="result.error.value"
    @retry="result.refetch()"
    ><template v-if="row"
      ><PageHeading
        :title="row.title || row.type || 'Request details'"
        :description="`${kind === 'leave' ? 'Time off' : 'Workplace request'} · ${row.employeeName || 'Employee'}`"
        ><StatusBadge :status="row.status"
      /></PageHeading>
      <div class="detail-grid">
        <section class="panel">
          <div class="section-heading">
            <h2>Request details</h2>
            <span class="subtle">Revision {{ row.version }}</span>
          </div>
          <dl class="detail-list">
            <div>
              <dt>Requested by</dt>
              <dd>{{ row.employeeName || 'Not provided' }}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{{ row.type || 'General' }}</dd>
            </div>
            <template v-if="kind === 'leave'"
              ><div>
                <dt>Dates</dt>
                <dd>{{ dateLabel(row.startDate) }} – {{ dateLabel(row.endDate) }}</dd>
              </div>
              <div>
                <dt>Requested time</dt>
                <dd>
                  {{ row.days === undefined ? 'Calculated by your workspace' : `${row.days} days` }}
                </dd>
              </div></template
            >
            <div v-else>
              <dt>Quantity</dt>
              <dd>{{ row.quantity ?? 1 }}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{{ dateLabel(row.createdAt) }}</dd>
            </div>
            <div>
              <dt>Context</dt>
              <dd class="pre-wrap">{{ row.reason || 'No additional context provided.' }}</dd>
            </div>
            <div v-if="row.decisionReason">
              <dt>Decision reason</dt>
              <dd>{{ row.decisionReason }}</dd>
            </div>
          </dl>
          <p v-if="feedback.error.value" class="form-error" role="alert">
            {{ feedback.error.value }}
          </p>
          <div class="detail-actions">
            <PButton
              v-if="kind === 'request' && row.status === 'DRAFT' && isOwn"
              label="Submit for approval"
              icon="pi pi-send"
              :loading="feedback.busy.value"
              @click="requestAction('submit')"
            /><PButton
              v-if="session.isManager && row.status === 'PENDING'"
              label="Approve"
              icon="pi pi-check"
              :loading="feedback.busy.value"
              @click="requestAction('approve')"
            /><PButton
              v-if="session.isManager && row.status === 'PENDING'"
              label="Reject"
              severity="danger"
              outlined
              :disabled="feedback.busy.value"
              @click="reasonDialog = true"
            /><PButton
              v-if="
                session.isAdmin &&
                kind === 'request' &&
                row.status === 'APPROVED' &&
                row.type === 'Equipment'
              "
              label="Mark fulfilled"
              :loading="feedback.busy.value"
              @click="requestAction('fulfill')"
            /><PButton
              v-if="isOwn && ['DRAFT', 'PENDING'].includes(row.status || '')"
              label="Cancel request"
              severity="secondary"
              outlined
              :disabled="feedback.busy.value"
              @click="requestAction('cancel')"
            />
          </div>
        </section>
        <aside class="panel detail-aside">
          <span class="record-icon leave"><AppIcon name="history" /></span>
          <h2>Where things stand</h2>
          <div class="activity-item">
            <span class="activity-dot" />
            <div>
              <strong>{{ titleCase(row.status) }}</strong>
              <p>
                {{
                  row.status === 'PENDING'
                    ? 'Waiting for an authorized approver to review this request.'
                    : row.status === 'DRAFT'
                      ? 'This draft hasn’t been sent to an approver yet.'
                      : 'This is the current recorded state of your request.'
                }}
              </p>
            </div>
          </div>
          <p class="small-note">
            The latest record is checked before every decision. If it has changed, you’ll be asked
            to refresh and review it.
          </p>
        </aside>
      </div></template
    ></QueryState
  >
  <PDialog
    v-model:visible="reasonDialog"
    header="Reject this request"
    modal
    :style="{ width: '30rem' }"
    ><form class="app-form" @submit.prevent="reject">
      <div class="field">
        <label for="decision-reason">Help the requester understand why</label
        ><PTextarea
          id="decision-reason"
          v-model="reason"
          rows="4"
          :aria-invalid="!!reasonError"
          aria-describedby="decision-error"
        /><small id="decision-error" class="field-error">{{ reasonError }}</small>
      </div>
      <div class="dialog-actions">
        <PButton
          label="Go back"
          severity="secondary"
          outlined
          @click="reasonDialog = false"
        /><PButton
          label="Reject request"
          type="submit"
          severity="danger"
          :loading="feedback.busy.value"
        />
      </div></form
  ></PDialog>
</template>
