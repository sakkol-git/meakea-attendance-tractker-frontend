<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
import { dateLabel, titleCase, tenantDay } from '~/utils/format'
const props = defineProps<{ kind: 'leave' | 'request'; id: string }>()
const api = useWorkspace()
const session = useSessionStore()
const route = useRoute()
const feedback = useFeedback()
const confirm = useConfirm()
const path = props.kind === 'leave' ? 'leaves' : 'requests'
const result = useWorkspaceQuery(`detail-${path}-${props.id}`, () => api.detail(path, props.id))
const row = computed(() => result.data.value?.row)
const reasonDialog = ref(false)
const reasonAction = ref<'reject' | 'cancel'>('reject')
const fulfillmentDialog = ref(false)
const editDraft = ref(false)
const decisionSaved = ref(false)
const isOwn = computed(() => row.value?.employeeId === session.profile?.employeeId)

async function perform(action: string, note?: string) {
  if (!row.value) return
  const response = await feedback.run(
    () =>
      api.change(path, props.id, action, row.value!.version, note ? { reason: note } : undefined),
    `Request ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'fulfill' ? 'fulfilled' : 'cancelled'}`,
  )
  if (response) {
    reasonDialog.value = false
    decisionSaved.value = ['approve', 'reject'].includes(action)
  }
}

function decisionSummary(action: string) {
  if (!row.value) return ''
  const employee = row.value.employeeName || 'Employee'
  const request = row.value.title || row.value.type || 'request'
  const effect =
    props.kind === 'leave'
      ? `${dateLabel(row.value.startDate)} to ${dateLabel(row.value.endDate)} · ${row.value.days ?? 'calculated'} days`
      : `${row.value.quantity ?? 1} requested`
  return `${employee} · ${request} · ${effect}. ${titleCase(action)} will record this decision and continue the workflow.`
}

function requestAction(action: string) {
  if (action === 'cancel' && row.value?.status === 'APPROVED') {
    reasonAction.value = 'cancel'
    reasonDialog.value = true
    return
  }
  confirm.require({
    header: `${titleCase(action)} this request?`,
    message:
      action === 'cancel'
        ? 'This will withdraw the request. Review its details before continuing.'
        : decisionSummary(action),
    acceptLabel: titleCase(action),
    rejectLabel: 'Go back',
    acceptProps: { severity: action === 'cancel' ? 'danger' : 'primary' },
    accept: () => perform(action),
  })
}

function openReject() {
  reasonAction.value = 'reject'
  reasonDialog.value = true
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
          <ApprovalContext :row="row" :kind="kind" />
          <p v-if="feedback.error.value" class="form-error" role="alert">
            {{ feedback.error.value }}
          </p>
          <AttachmentManager :scope="kind" :record-id="id" class="record-attachments" />
          <div class="detail-actions">
            <NuxtLink
              :to="{
                path: '/workflows/BF-026',
                query: { scope: kind === 'leave' ? 'leave' : 'request', record: id },
              }"
              class="text-link"
              >Advanced evidence vault<AppIcon name="paperclip"
            /></NuxtLink>
            <PButton
              v-if="kind === 'request' && row.status === 'DRAFT' && isOwn"
              label="Edit draft"
              outlined
              icon="pi pi-pencil"
              @click="editDraft = true"
            />
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
              @click="openReject"
            /><PButton
              v-if="
                session.isAdmin &&
                kind === 'request' &&
                row.status === 'APPROVED' &&
                row.type === 'Equipment'
              "
              label="Mark fulfilled"
              :loading="feedback.busy.value"
              @click="fulfillmentDialog = true"
            /><PButton
              v-if="
                isOwn &&
                (['DRAFT', 'PENDING'].includes(row.status || '') ||
                  (kind === 'leave' &&
                    row.status === 'APPROVED' &&
                    (row.startDate || '') >
                      tenantDay(new Date().toISOString(), session.profile?.timeZone)))
              "
              label="Cancel request"
              severity="secondary"
              outlined
              :disabled="feedback.busy.value"
              @click="requestAction('cancel')"
            />
          </div>
          <div v-if="decisionSaved" class="info-banner" role="status">
            Decision recorded.
            <NuxtLink
              v-if="route.query.next"
              :to="`/${kind === 'leave' ? 'leave' : 'requests'}/${route.query.next}?from=approvals`"
              class="text-link"
            >
              Next request<AppIcon name="arrow-right" />
            </NuxtLink>
            <NuxtLink v-else to="/approvals" class="text-link">
              Back to approvals<AppIcon name="arrow-right" />
            </NuxtLink>
          </div>
        </section>
        <aside class="panel detail-aside">
          <span class="record-icon leave"><AppIcon name="history" /></span>
          <h2>Where things stand</h2>
          <MaterialIssueHistory v-if="kind === 'request'" :history="row.history ?? []" />
          <div v-for="(event, index) in row.history ?? []" :key="index" class="activity-item">
            <span class="activity-dot" />
            <div>
              <strong>{{ titleCase(event.status) }}</strong>
              <p>{{ dateLabel(event.at, 'MMM d, h:mm a') }} {{ event.reason }}</p>
            </div>
          </div>
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
  <MaterialFulfillDialog
    v-if="session.isAdmin && kind === 'request' && row?.status === 'APPROVED'"
    v-model:visible="fulfillmentDialog"
    :record-id="id"
    :max-quantity="(row?.quantity ?? 1) - (row?.fulfilledQuantity ?? 0)"
    :version="row?.version ?? 1"
    :request-title="row?.title || row?.type || 'Material request'"
    :requester="row?.employeeName || 'Employee'"
    :requested-quantity="row?.quantity ?? 1"
    :issued-quantity="row?.fulfilledQuantity ?? 0"
    @fulfilled="() => result.refetch()"
  />

  <ResourceForm
    v-if="kind === 'request' && row"
    v-model:visible="editDraft"
    kind="request"
    :initial="row"
  />

  <DecisionReasonDialog
    v-model:visible="reasonDialog"
    :action="reasonAction"
    :loading="feedback.busy.value"
    @confirm="(note) => perform(reasonAction, note)"
  />
</template>
