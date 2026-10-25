<script setup lang="ts">
import type { Resource } from '~/types/workspace'

defineProps<{
  values: Record<string, any>
  errors: Record<string, string>
  path?: Resource
}>()
</script>

<template>
  <div class="field">
    <label for="form-name">Name</label>
    <PInputText
      id="form-name"
      v-model="values.name"
      :aria-invalid="!!errors.name"
      aria-describedby="error-name"
    />
    <small id="error-name" class="field-error">{{ errors.name }}</small>
  </div>

  <div v-if="path === 'materials'" class="field">
    <label for="form-stock">Available quantity</label>
    <input
      id="form-stock"
      v-model.number="values.quantity"
      type="number"
      min="0"
      max="1000000"
      :aria-invalid="!!errors.quantity"
      aria-describedby="error-quantity"
    />
    <small id="error-quantity" class="field-error">{{ errors.quantity }}</small>
  </div>

  <div v-if="path === 'holidays'" class="field">
    <label for="form-holiday-date">Holiday date</label>
    <input
      id="form-holiday-date"
      v-model="values.date"
      type="date"
      :aria-invalid="!!errors.date"
      aria-describedby="error-date"
    />
    <small id="error-date" class="field-error">{{ errors.date }}</small>
  </div>

  <div v-if="path === 'shifts'" class="form-grid">
    <div class="field">
      <label for="form-shift-start">Start time</label>
      <input
        id="form-shift-start"
        v-model="values.start"
        type="time"
        :aria-invalid="!!errors.start"
        aria-describedby="error-start"
      />
      <small id="error-start" class="field-error">{{ errors.start }}</small>
    </div>
    <div class="field">
      <label for="form-shift-end">End time</label>
      <input
        id="form-shift-end"
        v-model="values.end"
        type="time"
        :aria-invalid="!!errors.end"
        aria-describedby="error-end"
      />
      <small id="error-end" class="field-error">{{ errors.end }}</small>
    </div>
  </div>

  <div class="field">
    <label for="form-description">Description <span>(optional)</span></label>
    <PTextarea id="form-description" v-model="values.description" rows="3" auto-resize />
  </div>
</template>
