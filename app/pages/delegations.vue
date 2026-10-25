<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'

definePageMeta({ roles: ['MANAGER', 'HR_ADMIN', 'OWNER'] })
const api = useWorkspace()
const feedback = useFeedback()
const confirm = useConfirm()
const visible = ref(false)
const dirty = ref(false)
const delegateId = ref('')
const startsOn = ref('')
const endsOn = ref('')
const reason = ref('')
const delegations = useWorkspaceQuery('approval-delegations', () => api.delegations())
const candidates = useWorkspaceQuery('eligible-delegates', () => api.eligibleDelegates())

function openForm() {
  delegateId.value = ''
  startsOn.value = ''
  endsOn.value = ''
  reason.value = ''
  dirty.value = false
  visible.value = true
}

function requestClose() {
  if (!dirty.value) {
    visible.value = false
    return
  }
  confirm.require({
    header: 'Discard delegation?',
    message: 'Your selected reviewer, dates and reason will be lost.',
    acceptLabel: 'Discard',
    rejectLabel: 'Keep editing',
    acceptProps: { severity: 'danger' },
    accept: () => {
      dirty.value = false
      visible.value = false
    },
  })
}

function updateVisible(next: boolean) {
  if (next) visible.value = true
  else requestClose()
}

async function save() {
  if (
    !delegateId.value ||
    !startsOn.value ||
    endsOn.value < startsOn.value ||
    reason.value.trim().length < 5
  ) {
    feedback.error.value =
      'Choose a reviewer, valid dates and a reason of at least five characters.'
    return
  }
  const result = await feedback.run(
    () =>
      api.createDelegation({
        delegateId: delegateId.value,
        startsOn: startsOn.value,
        endsOn: endsOn.value,
        reason: reason.value.trim(),
      }),
    'Delegation created',
  )
  if (result) {
    dirty.value = false
    visible.value = false
  }
}

function cancel(id: string, version: number, delegateName: string) {
  confirm.require({
    header: 'Cancel delegation?',
    message: `${delegateName} will stop receiving delegated approvals.`,
    acceptLabel: 'Cancel delegation',
    rejectLabel: 'Keep',
    acceptProps: { severity: 'danger' },
    accept: () => feedback.run(() => api.cancelDelegation(id, version), 'Delegation cancelled'),
  })
}
</script>

<template>
  <PageHeading
    title="Approval delegation"
    description="Assign a qualified reviewer for a defined period. You remain accountable."
    eyebrow="REVIEW COVERAGE"
  >
    <PButton label="New delegation" icon="pi pi-plus" @click="openForm" />
  </PageHeading>

  <QueryState
    :pending="delegations.isPending.value"
    :error="delegations.error.value"
    :empty="!delegations.data.value?.items.length"
    title="No delegations"
    message="Create a delegation when another reviewer must cover your approvals."
    @retry="delegations.refetch()"
  >
    <section class="panel no-padding">
      <PDataTable
        :value="delegations.data.value?.items ?? []"
        data-key="id"
        class="workspace-table"
      >
        <PColumn field="delegateName" header="Reviewer" />
        <PColumn header="Coverage period">
          <template #body="{ data }">{{ data.startsOn }} – {{ data.endsOn }}</template>
        </PColumn>
        <PColumn field="reason" header="Reason" />
        <PColumn header="Status"
          ><template #body="{ data }"><StatusBadge :status="data.status" /></template
        ></PColumn>
        <PColumn header="Action">
          <template #body="{ data }">
            <PButton
              v-if="data.status === 'ACTIVE'"
              label="Cancel"
              severity="danger"
              outlined
              @click="cancel(data.id, data.version, data.delegateName)"
            />
          </template>
        </PColumn>
      </PDataTable>
    </section>
  </QueryState>

  <PDialog
    :visible="visible"
    modal
    header="New approval delegation"
    class="dialog-md"
    :closable="!feedback.busy.value"
    :close-on-escape="false"
    @update:visible="updateVisible"
  >
    <form class="app-form" @input="dirty = true" @change="dirty = true" @submit.prevent="save">
      <div class="field">
        <label for="delegate-reviewer">Reviewer · Required</label>
        <PSelect
          input-id="delegate-reviewer"
          v-model="delegateId"
          :options="candidates.data.value?.items ?? []"
          option-label="name"
          option-value="id"
          aria-label="Reviewer"
          filter
          required
        />
      </div>
      <div class="form-grid two">
        <div class="field">
          <label for="delegate-start">Start date · Required</label
          ><input id="delegate-start" v-model="startsOn" type="date" required />
        </div>
        <div class="field">
          <label for="delegate-end">End date · Required</label
          ><input id="delegate-end" v-model="endsOn" type="date" :min="startsOn" required />
        </div>
      </div>
      <div class="field">
        <label for="delegate-reason">Reason · Required</label>
        <PTextarea id="delegate-reason" v-model="reason" minlength="5" maxlength="500" required />
      </div>
      <p v-if="feedback.error.value" role="alert" class="form-error">{{ feedback.error.value }}</p>
      <div class="dialog-actions">
        <PButton
          label="Go back"
          severity="secondary"
          outlined
          :disabled="feedback.busy.value"
          @click="requestClose"
        />
        <PButton label="Create delegation" type="submit" :loading="feedback.busy.value" />
      </div>
    </form>
  </PDialog>
</template>
