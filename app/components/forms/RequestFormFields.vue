<script setup lang="ts">
const props = defineProps<{
  values: Record<string, any>
  errors: Record<string, string>
}>()

const api = useWorkspace()
const materials = useWorkspaceQuery('request-form-materials', () => api.list('materials'))
const typeOptions = [
  { label: 'General', value: 'GENERAL' },
  { label: 'Material or equipment', value: 'MATERIAL' },
  { label: 'Remote work', value: 'REMOTE_WORK' },
  { label: 'Late arrival', value: 'LATE_ARRIVAL' },
  { label: 'Early leave', value: 'EARLY_LEAVE' },
]
const needsDates = computed(() =>
  ['REMOTE_WORK', 'LATE_ARRIVAL', 'EARLY_LEAVE'].includes(String(props.values.type)),
)
const needsTimes = computed(() =>
  ['LATE_ARRIVAL', 'EARLY_LEAVE'].includes(String(props.values.type)),
)
</script>

<template>
  <div class="field">
    <label for="form-title">What do you need?</label>
    <PInputText
      id="form-title"
      v-model="values.title"
      placeholder="For example, a monitor for my desk"
      :aria-invalid="!!errors.title"
      aria-describedby="error-title"
    />
    <small id="error-title" class="field-error">{{ errors.title }}</small>
  </div>

  <div class="field">
    <label for="form-type">Request type</label>
    <PSelect
      input-id="form-type"
      v-model="values.type"
      :options="typeOptions"
      option-label="label"
      option-value="value"
      aria-label="Request type"
      placeholder="Select a type"
      :invalid="!!errors.type"
      :aria-invalid="!!errors.type"
      aria-describedby="error-type"
    />
    <small id="error-type" class="field-error">{{ errors.type }}</small>
  </div>

  <div v-if="values.type === 'MATERIAL'" class="form-grid">
    <div class="field">
      <label for="form-material">Material</label>
      <PSelect
        input-id="form-material"
        v-model="values.materialId"
        :options="materials.data.value?.items || []"
        option-label="name"
        option-value="id"
        aria-label="Material"
        placeholder="Select a material"
        :loading="materials.isPending.value"
        :invalid="!!errors.materialId"
        :aria-invalid="!!errors.materialId"
        aria-describedby="error-material"
      />
      <small id="error-material" class="field-error">{{ errors.materialId }}</small>
    </div>
    <div class="field">
      <label for="form-quantity">Quantity</label>
      <input
        id="form-quantity"
        v-model.number="values.quantity"
        type="number"
        min="1"
        max="100"
        :aria-invalid="!!errors.quantity"
        aria-describedby="error-quantity"
      />
      <small id="error-quantity" class="field-error">{{ errors.quantity }}</small>
    </div>
  </div>

  <div v-if="needsDates" class="form-grid">
    <div class="field">
      <label for="form-request-start">From</label>
      <input
        id="form-request-start"
        v-model="values.startDate"
        type="date"
        :aria-invalid="!!errors.startDate"
      />
      <small class="field-error">{{ errors.startDate }}</small>
    </div>
    <div class="field">
      <label for="form-request-end">To</label>
      <input
        id="form-request-end"
        v-model="values.endDate"
        type="date"
        :aria-invalid="!!errors.endDate"
      />
      <small class="field-error">{{ errors.endDate }}</small>
    </div>
  </div>

  <div v-if="needsTimes" class="form-grid">
    <div class="field">
      <label for="form-request-from-time">From time</label>
      <input
        id="form-request-from-time"
        v-model="values.fromTime"
        type="time"
        :aria-invalid="!!errors.fromTime"
      />
      <small class="field-error">{{ errors.fromTime }}</small>
    </div>
    <div class="field">
      <label for="form-request-to-time">To time</label>
      <input
        id="form-request-to-time"
        v-model="values.toTime"
        type="time"
        :aria-invalid="!!errors.toTime"
      />
      <small class="field-error">{{ errors.toTime }}</small>
    </div>
  </div>

  <div class="field">
    <label for="form-reason">Reason</label>
    <PTextarea
      id="form-reason"
      v-model="values.reason"
      rows="4"
      auto-resize
      placeholder="Add enough detail for your reviewer."
      :aria-invalid="!!errors.reason"
      aria-describedby="error-reason"
    />
    <small id="error-reason" class="field-error">{{ errors.reason }}</small>
  </div>
</template>
