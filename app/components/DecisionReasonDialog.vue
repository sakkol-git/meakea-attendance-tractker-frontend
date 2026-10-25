<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  action: 'reject' | 'cancel'
  loading?: boolean
  title?: string
  label?: string
  submitLabel?: string
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
  confirm: [reason: string]
}>()

const reason = ref('')
const reasonError = ref('')

watch(
  () => props.visible,
  (val) => {
    if (val) {
      reason.value = ''
      reasonError.value = ''
    }
  },
)

function submit() {
  if (reason.value.trim().length < 5) {
    reasonError.value = 'Add a reason in at least five characters.'
    return
  }
  emit('confirm', reason.value.trim())
}
</script>

<template>
  <PDialog
    :visible="visible"
    :header="
      title || (action === 'reject' ? 'Reject this request' : 'Cancel future approved leave')
    "
    modal
    class="dialog-md"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <form class="app-form" @submit.prevent="submit">
      <div class="field">
        <label for="decision-reason">{{ label || 'Help the requester understand why' }}</label>
        <PTextarea
          id="decision-reason"
          v-model="reason"
          rows="4"
          :aria-invalid="!!reasonError"
          aria-describedby="decision-error"
        />
        <small id="decision-error" class="field-error">{{ reasonError }}</small>
      </div>
      <div class="dialog-actions">
        <PButton
          label="Go back"
          severity="secondary"
          outlined
          @click="emit('update:visible', false)"
        />
        <PButton
          :label="submitLabel || (action === 'reject' ? 'Reject request' : 'Cancel approved leave')"
          type="submit"
          severity="danger"
          :loading="loading"
        />
      </div>
    </form>
  </PDialog>
</template>
