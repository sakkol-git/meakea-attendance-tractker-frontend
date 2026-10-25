<script setup lang="ts">
defineProps<{
  values: Record<string, any>
  errors: Record<string, string>
}>()
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

  <div class="form-grid">
    <div class="field">
      <label for="form-type">Request type</label>
      <PSelect
        input-id="form-type"
        v-model="values.type"
        :options="['Equipment', 'Remote work', 'General']"
        aria-label="Request type"
        placeholder="Select a type"
        :aria-invalid="!!errors.type"
        aria-describedby="error-type"
      />
      <small id="error-type" class="field-error">{{ errors.type }}</small>
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

  <div class="field">
    <label for="form-reason">A little context</label>
    <PTextarea
      id="form-reason"
      v-model="values.reason"
      rows="4"
      auto-resize
      placeholder="Add the details your approver needs…"
      :aria-invalid="!!errors.reason"
      aria-describedby="error-reason"
    />
    <small id="error-reason" class="field-error">{{ errors.reason }}</small>
  </div>
</template>
