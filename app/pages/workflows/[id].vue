<script setup lang="ts">
import { workflowById } from '~/features/workflows/catalog'
import { workflowActions } from '~/features/workflows/forms'
import { dateLabel, titleCase } from '~/utils/format'
import type { RecordData } from '~/data/source'
import type { WorkflowRecord } from '~/api/business'
definePageMeta({ key: (route) => String(route.params.id) })
const route = useRoute()
const session = useSessionStore()
const app = useNuxtApp()
const feedback = useFeedback()
const id = String(route.params.id).toUpperCase()
const flow = workflowById(id)
if (!flow) throw createError({ statusCode: 404, statusMessage: 'Workflow not found' })
const allowed = computed(() => session.roles.some((role) => flow.roles.includes(role)))
const actions =
  [5, 18].includes(flow.number) && !session.isAdmin ? [] : workflowActions(flow.number)
const selected = ref(actions[0]?.key ?? '')
const active = computed(() => actions.find((x) => x.key === selected.value))
const result = useWorkspaceQuery(`business-${id}`, () => app.$business.snapshot(id))
const expanded = ref<WorkflowRecord>()
watch(result.data, (data) => {
  if (expanded.value) {
    const fresh = data?.items.find((x) => x.id === expanded.value?.id)
    if (fresh) expanded.value = fresh
  }
})
const formVisible = ref(false)
const core = useWorkspace()
const clockState = [7, 8].includes(flow.number)
  ? useWorkspaceQuery('today', () => core.today())
  : undefined
const openSession = computed(() => clockState?.data.value?.sessions.find((x) => !x.clockOut))
async function clock() {
  const response = await feedback.run(
    () => core.clock(openSession.value),
    openSession.value ? 'Clock-out recorded' : 'Clock-in recorded',
  )
  if (response) {
    await clockState?.refetch()
    await result.refetch()
  }
}
let attemptKey = crypto.randomUUID()
let attemptSignature = ''
let timer: ReturnType<typeof setInterval>
const actionReferences = computed(() => [
  ...new Map(
    [
      ...(result.data.value?.items ?? []).map((x) => ({
        id: x.id,
        name: `${x.title} · ${x.status}`,
        kind: 'record',
      })),
      ...(result.data.value?.references ?? []),
    ].map((x) => [x.id, x]),
  ).values(),
])
const versions = computed(() =>
  Object.fromEntries(
    [...(result.data.value?.items ?? []), ...(result.data.value?.references ?? [])]
      .filter((x) => x.version !== undefined)
      .map((x) => [x.id, x.version!]),
  ),
)
async function submit(values: RecordData) {
  const signature = JSON.stringify([
    selected.value,
    values,
    values.recordId ? versions.value[String(values.recordId)] : undefined,
  ])
  if (signature !== attemptSignature) {
    attemptKey = crypto.randomUUID()
    attemptSignature = signature
  }
  const record = await feedback.run(
    () => app.$business.execute(id, selected.value, values, attemptKey, versions.value),
    'Workflow state recorded',
  )
  if (record) {
    expanded.value = record
    attemptSignature = ''
    await result.refetch()
  }
}
const uploadScope = ref<'leave' | 'request'>(route.query.scope === 'leave' ? 'leave' : 'request')
const ownerId = ref(typeof route.query.record === 'string' ? route.query.record : '')
const file = ref<File>()
const fileInput = ref<HTMLInputElement>()
async function upload() {
  if (!file.value) return
  const record = await feedback.run(
    () => app.$business.upload(uploadScope.value, ownerId.value, file.value!),
    'Local file attached',
  )
  if (record) {
    expanded.value = record
    file.value = undefined
    if (fileInput.value) fileInput.value.value = ''
    await result.refetch()
  }
}
function printable(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}
async function logout() {
  let unconfirmed = false
  await feedback.run(async () => {
    try {
      await session.signOut()
    } catch (error) {
      unconfirmed = true
      throw error
    }
  })
  if (!session.profile) await navigateTo(unconfirmed ? '/login?logout=unconfirmed' : '/login')
}
const formKind = computed(() =>
  flow.number === 4
    ? 'employee'
    : flow.number === 14
      ? 'leave'
      : flow.number === 12
        ? 'correction'
        : flow.number === 21
          ? 'request'
          : undefined,
)
onMounted(() => {
  timer = setInterval(() => {
    if (result.data.value?.items.some((x) => x.status === 'QUEUED')) result.refetch()
  }, 1600)
})
onBeforeUnmount(() => clearInterval(timer))
</script>
<template>
  <NuxtLink to="/workflows" class="back-link"><AppIcon name="arrow-left" />All workflows</NuxtLink
  ><PageHeading
    :title="flow.title"
    :description="flow.purpose"
    :eyebrow="`${flow.id} · ${flow.group}`"
    ><NuxtLink v-if="flow.route" :to="flow.route" class="text-link"
      >Open
      {{ flow.number === 40 ? 'sign-in' : flow.number === 1 ? 'sign-in' : 'main workspace screen'
      }}<AppIcon name="arrow-up-right" /></NuxtLink
  ></PageHeading>
  <section v-if="!allowed" class="empty-state panel">
    <span class="state-icon"><AppIcon name="lock" /></span>
    <h2>This workflow needs another role</h2>
    <p>
      Required: {{ flow.roles.map(titleCase).join(', ') }}. Your current role cannot perform these
      actions.
    </p>
  </section>
  <template v-else
    ><p class="info-banner">
      <AppIcon name="info-circle" />{{
        session.mode === 'local'
          ? 'Demo workflow preview. State changes are synthetic and reset on refresh.'
          : 'Remote mode: advanced operations require accepted backend contracts.'
      }}
      <span v-if="flow.number >= 31 && flow.number <= 39"
        >Production operator authorization is separate from the tenant owner role.</span
      >
    </p>
    <div class="detail-grid workflow-detail-grid">
      <section class="panel">
        <h2>Actions and review</h2>
        <p class="workflow-intro">
          {{
            flow.number >= 31 && flow.number <= 39
              ? 'Inspect this technical workflow and exercise its clearly labeled local simulation. No private worker, broker, scheduler or production job is invoked.'
              : 'Use the existing workspace screen for the core journey, or the advanced action below. Review the reference and current state before confirming.'
          }}
        </p>
        <div v-if="formKind" class="inline-actions">
          <PButton
            :label="
              flow.number === 4
                ? 'Add employee'
                : flow.number === 14
                  ? 'Request time off'
                  : 'Create request draft'
            "
            icon="pi pi-plus"
            @click="formVisible = true"
          />
        </div>
        <div v-if="clockState" class="workflow-intro">
          <QueryState
            :pending="clockState.isPending.value"
            :error="clockState.error.value"
            @retry="clockState.refetch()"
            ><p>{{ openSession ? 'A work session is open.' : 'There is no open session.' }}</p>
            <PButton
              :label="openSession ? 'Clock out' : 'Clock in'"
              :loading="feedback.busy.value"
              @click="clock"
          /></QueryState>
        </div>
        <PButton
          v-if="flow.number === 40"
          label="Sign out and revoke session"
          icon="pi pi-sign-out"
          severity="danger"
          :loading="feedback.busy.value"
          @click="logout"
        />
        <div v-if="actions.length" class="field workflow-action-picker">
          <label for="workflow-action">Action</label
          ><PSelect
            input-id="workflow-action"
            v-model="selected"
            :options="actions"
            option-label="label"
            option-value="key"
            aria-label="Workflow action"
          />
        </div>
        <WorkflowActionForm
          v-if="active"
          :key="active.key"
          :action="active"
          :references="actionReferences"
          :busy="feedback.busy.value"
          @submit="submit"
        />
        <form v-if="flow.number === 26" class="app-form" @submit.prevent="upload">
          <div class="field">
            <label for="file-scope">Attach to</label
            ><PSelect
              input-id="file-scope"
              v-model="uploadScope"
              :options="['request', 'leave']"
              aria-label="Attach to"
            />
          </div>
          <div class="field">
            <label for="file-owner">Request reference</label
            ><PSelect
              input-id="file-owner"
              v-model="ownerId"
              aria-label="Request reference"
              :options="result.data.value?.references.filter((x) => x.kind === uploadScope) ?? []"
              option-label="name"
              option-value="id"
              filter
              placeholder="Choose your request"
            /><datalist id="file-references">
              <option
                v-for="ref in result.data.value?.references ?? []"
                :key="ref.id"
                :value="ref.id"
              >
                {{ ref.name }}
              </option>
            </datalist>
          </div>
          <div class="field">
            <label for="private-file">Private evidence file</label
            ><input
              id="private-file"
              ref="fileInput"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              required
              @change="file = ($event.target as HTMLInputElement).files?.[0]"
            /><small
              >Local demo: PDF, PNG or JPEG up to 10 MiB. Content headers are checked; malware
              scanning and production retention remain server responsibilities.</small
            >
          </div>
          <PButton label="Attach local file" type="submit" :loading="feedback.busy.value" />
        </form>
        <p
          v-if="!actions.length && !formKind && flow.number !== 26 && flow.number !== 40"
          class="small-note"
        >
          This workflow runs through the linked workspace screen or automatically as part of the
          server/session lifecycle. The record view below is for inspection; there is no invented
          production command.
        </p>
        <p v-if="feedback.error.value" class="form-error" role="alert">
          {{ feedback.error.value }}
        </p>
      </section>
      <aside class="panel">
        <h2>Current references</h2>
        <p class="small-note workflow-intro">
          Choose exact references from the current workspace. Record revisions are checked before
          advanced commands.
        </p>
        <div
          v-for="ref in result.data.value?.references ?? []"
          :key="ref.id"
          class="workflow-reference"
        >
          <strong>{{ ref.name }}</strong
          ><code>{{ ref.id }}</code>
        </div>
        <p v-if="!result.data.value?.references.length" class="small-note">
          This workflow has no external record selection.
        </p>
        <div class="gentle-note">
          <AppIcon name="book" />
          <p>
            Source: <code>business-flow.md</code> → <code>{{ flow.source }}</code> → {{ flow.id }}.
            Client preview choices do not change approved architecture or unresolved company policy.
          </p>
        </div>
      </aside>
    </div>
    <section class="panel workflow-records">
      <div class="section-heading">
        <h2>Records and evidence</h2>
        <PButton
          label="Refresh records"
          icon="pi pi-refresh"
          outlined
          :loading="result.isFetching.value"
          @click="result.refetch()"
        />
      </div>
      <QueryState
        :pending="result.isPending.value"
        :error="result.error.value"
        :empty="!result.data.value?.items.length"
        title="No workflow records yet"
        message="Start the journey above. Confirmed results and review history will appear here."
        @retry="result.refetch()"
        ><p class="small-note">{{ result.data.value?.note }}</p>
        <div class="workflow-record-list">
          <article
            v-for="row in result.data.value?.items ?? []"
            :key="row.id"
            class="workflow-record"
          >
            <div>
              <button class="record-title-button" @click="expanded = row">{{ row.title }}</button
              ><code>{{ row.id }}</code
              ><small
                >Revision {{ row.version }} ·
                {{
                  row.createdAt
                    ? dateLabel(row.createdAt, 'MMM d, h:mm a')
                    : 'Existing workspace record'
                }}</small
              >
            </div>
            <div class="inline-actions">
              <StatusBadge :status="row.status" />
              <NuxtLink
                v-if="
                  [14, 15, 16, 17, 21, 22, 23, 24, 25].includes(flow.number) &&
                  row.id.startsWith('demo-')
                "
                :to="`${flow.number < 20 ? '/leave' : '/requests'}/${row.id}`"
                class="text-link"
                >Open request<AppIcon name="arrow-up-right" /></NuxtLink
              ><PButton
                v-if="flow.number === 26 || (flow.number === 30 && row.status === 'COMPLETED')"
                label="Download"
                icon="pi pi-download"
                outlined
                @click="feedback.run(() => app.$business.download(id, row.id))"
              /><PButton label="Review" text @click="expanded = row" />
            </div>
          </article></div
      ></QueryState>
    </section>
    <ResourceForm
      v-if="formKind"
      v-model:visible="formVisible"
      :kind="formKind"
      @saved="result.refetch()" /></template
  ><PDialog
    :visible="!!expanded"
    modal
    :header="expanded?.title"
    :style="{ width: '42rem' }"
    @update:visible="expanded = undefined"
    ><template v-if="expanded"
      ><StatusBadge :status="expanded.status" />
      <dl class="detail-list">
        <div v-for="(value, key) in expanded.details" :key="key">
          <dt>{{ titleCase(String(key).replace(/([A-Z])/g, ' $1')) }}</dt>
          <dd class="pre-wrap">{{ printable(value) }}</dd>
        </div>
      </dl>
      <h3 class="workflow-history-title">Review history</h3>
      <div v-for="(event, index) in expanded.history" :key="index" class="activity-item">
        <span class="activity-dot" />
        <div>
          <strong>{{ titleCase(event.action) }}</strong>
          <p>{{ event.actor }} · {{ dateLabel(event.at, 'MMM d, h:mm:ss a') }}</p>
        </div>
      </div></template
    ></PDialog
  >
</template>
