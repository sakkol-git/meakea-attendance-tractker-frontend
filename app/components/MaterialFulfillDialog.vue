<script setup lang="ts">
import { failureMessage } from '~/utils/failure'
const props = defineProps<{
  visible: boolean
  recordId: string
  maxQuantity: number
  version: number
  requestTitle: string
  requester: string
  requestedQuantity: number
  issuedQuantity: number
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
  fulfilled: []
}>()

const api = useWorkspace()
const feedback = useFeedback()

const materialId = ref('')
const issueQuantity = ref(1)
const issueReason = ref('')

const materials = useWorkspaceQuery('fulfillment-materials', () => api.list('materials'))
const selectedMaterial = computed(() =>
  materials.data.value?.items.find((item) => item.id === materialId.value),
)
const stock = computed(() => Number(selectedMaterial.value?.quantity ?? 0))
const stockAfter = computed(() => stock.value - Number(issueQuantity.value || 0))

async function issue() {
  if (issueReason.value.trim().length < 5) {
    feedback.error.value = 'Add an issue reason in at least five characters.'
    return
  }
  if (
    !materialId.value ||
    !Number.isInteger(issueQuantity.value) ||
    issueQuantity.value < 1 ||
    issueQuantity.value > props.maxQuantity ||
    issueQuantity.value > stock.value
  ) {
    feedback.error.value =
      'Issue no more than the available stock or the request’s remaining quantity.'
    return
  }
  const response = await feedback.run(
    () =>
      api.issueMaterial({
        recordId: props.recordId,
        materialId: materialId.value,
        quantity: issueQuantity.value,
        reason: issueReason.value.trim(),
        expectedVersion: props.version,
      }),
    'Material issue recorded',
  )
  if (response) {
    emit('update:visible', false)
    emit('fulfilled')
  }
}
</script>

<template>
  <PDialog
    :visible="visible"
    modal
    header="Record material fulfillment"
    :closable="!feedback.busy.value"
    :close-on-escape="!feedback.busy.value"
    class="dialog-md"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <form class="app-form" :aria-busy="feedback.busy.value" @submit.prevent="issue">
      <p class="small-note">
        Issued quantities reduce available stock. A partial issue keeps the request approved until
        the full quantity is fulfilled.
      </p>
      <dl class="detail-list fulfillment-summary">
        <div>
          <dt>Request</dt>
          <dd>{{ requestTitle }} · {{ recordId }}</dd>
        </div>
        <div>
          <dt>Requester</dt>
          <dd>{{ requester }}</dd>
        </div>
        <div>
          <dt>Requested</dt>
          <dd>{{ requestedQuantity }}</dd>
        </div>
        <div>
          <dt>Already issued</dt>
          <dd>{{ issuedQuantity }}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{{ maxQuantity }}</dd>
        </div>
        <div>
          <dt>Current stock</dt>
          <dd>{{ materialId ? stock : 'Choose a material' }}</dd>
        </div>
        <div>
          <dt>Stock after this issue</dt>
          <dd>{{ materialId ? stockAfter : '—' }}</dd>
        </div>
      </dl>
      <div class="field">
        <div v-if="materials.error.value" role="alert" class="field-error">
          {{ failureMessage(materials.error.value) }}
          <PButton
            label="Retry materials"
            text
            :loading="materials.isFetching.value"
            @click="materials.refetch()"
          />
        </div>
        <label for="issue-material">Material</label>
        <PSelect
          input-id="issue-material"
          :disabled="feedback.busy.value"
          v-model="materialId"
          aria-label="Material"
          :options="materials.data.value?.items ?? []"
          :loading="materials.isPending.value"
          option-label="name"
          option-value="id"
          filter
        />
      </div>
      <div class="field">
        <label for="issue-quantity">Quantity to issue</label>
        <input
          id="issue-quantity"
          :disabled="feedback.busy.value"
          v-model.number="issueQuantity"
          type="number"
          min="1"
          :max="maxQuantity"
          aria-describedby="issue-quantity-help"
          required
        />
        <small id="issue-quantity-help">
          Use a whole number, up to the remaining request quantity and available stock.
        </small>
      </div>
      <div class="field">
        <label for="issue-reason">Issue reason</label>
        <PTextarea
          id="issue-reason"
          :disabled="feedback.busy.value"
          v-model="issueReason"
          minlength="5"
          maxlength="2000"
          aria-describedby="issue-reason-help"
          required
        />
        <small id="issue-reason-help">Use 5–2,000 characters to describe what was issued.</small>
      </div>
      <p v-if="feedback.error.value" role="alert" class="form-error">
        {{ feedback.error.value }}
      </p>
      <div class="dialog-actions">
        <PButton
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="feedback.busy.value"
          @click="emit('update:visible', false)"
        />
        <PButton
          label="Record material issue"
          type="submit"
          :loading="feedback.busy.value"
          :disabled="
            !materialId || issueQuantity < 1 || issueQuantity > maxQuantity || issueQuantity > stock
          "
        />
      </div>
    </form>
  </PDialog>
</template>
