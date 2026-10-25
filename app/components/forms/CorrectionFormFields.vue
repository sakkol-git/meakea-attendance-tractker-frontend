<script setup lang="ts">
defineProps<{
  values: Record<string, any>
  errors: Record<string, string>
}>()
</script>

<template>
  <div class="field">
    <label for="form-date">Affected date</label>
    <input
      id="form-date"
      v-model="values.date"
      type="date"
      :aria-invalid="!!errors.date"
      aria-describedby="error-date"
    />
    <small id="error-date" class="field-error">{{ errors.date }}</small>
  </div>

  <div class="field">
    <label for="form-reason">What happened?</label>
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
