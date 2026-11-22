<script setup lang="ts">
const model = defineModel<number>({ required: true })
defineProps<{ error?: string }>()
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
function toggle(index: number, checked: boolean) {
  const bit = 1 << index
  model.value = checked ? model.value | bit : model.value & ~bit
}
</script>

<template>
  <fieldset
    class="working-days"
    :aria-invalid="!!error"
    aria-describedby="working-days-help working-days-error"
  >
    <legend>Working days</legend>
    <p id="working-days-help" class="small-note">Select at least one day.</p>
    <div class="day-options">
      <label v-for="(day, index) in days" :key="day">
        <input
          type="checkbox"
          :checked="!!(model & (1 << index))"
          @change="toggle(index, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ day }}</span>
      </label>
    </div>
    <small id="working-days-error" class="field-error">{{ error }}</small>
  </fieldset>
</template>

<style scoped>
.working-days {
  min-width: 0;
  border: 0;
  padding: 0;
  margin: 0;
}
legend {
  font-weight: 600;
  margin-bottom: var(--space-2);
}
.day-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.day-options label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  min-height: var(--control-height);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
input {
  accent-color: var(--teal);
}
.day-options label:has(input:checked) {
  background: var(--teal-light);
  border-color: var(--teal);
}
</style>
