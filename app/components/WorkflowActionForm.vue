<script setup lang="ts">
import type { WorkflowAction } from '~/features/workflows/forms'
import type { RecordData } from '~/data/source'
const props = defineProps<{
  action: WorkflowAction
  busy: boolean
  references: { id: string; name: string; kind?: string }[]
}>()
const emit = defineEmits<{ submit: [RecordData] }>()
const values = reactive<Record<string, string | number | boolean>>({})
watch(
  () => props.action,
  (action) => {
    for (const key of Object.keys(values)) delete values[key]
    for (const field of action.fields)
      values[field.key] =
        field.type === 'checkbox'
          ? false
          : field.type === 'number'
            ? field.min && field.min > 0
              ? field.min
              : 0
            : ''
  },
  { immediate: true },
)
function referenceOptions(key: string) {
  const kind = (
    {
      employeeId: 'employee',
      managerId: 'employee',
      shiftId: 'shift',
      materialId: 'material',
    } as Record<string, string>
  )[key]
  return props.references.filter((x) =>
    kind ? x.kind === kind : !['employee', 'shift', 'material'].includes(x.kind ?? ''),
  )
}
function submit() {
  emit('submit', { ...values })
}
</script>
<template>
  <form class="app-form workflow-form" @submit.prevent="submit">
    <p v-if="action.warning" class="info-banner">{{ action.warning }}</p>
    <div class="form-grid">
      <div
        v-for="field in action.fields"
        :key="field.key"
        class="field"
        :class="{ 'span-full': field.type === 'textarea' }"
      >
        <template v-if="field.type === 'checkbox'"
          ><label class="checkbox-field"
            ><input
              v-model="values[field.key]"
              type="checkbox"
              :required="field.required"
              :disabled="busy"
            />{{ field.label }}</label
          ></template
        ><template v-else
          ><label :for="`wf-${field.key}`"
            >{{ field.label }}<span v-if="!field.required"> (optional)</span></label
          ><PSelect
            v-if="field.key.endsWith('Id')"
            :input-id="`wf-${field.key}`"
            v-model="values[field.key]"
            :aria-label="field.label"
            :options="referenceOptions(field.key)"
            option-label="name"
            option-value="id"
            filter
            :disabled="busy"
            placeholder="Choose a current record"
          />
          <PSelect
            v-else-if="field.type === 'select'"
            v-model="values[field.key]"
            :input-id="`wf-${field.key}`"
            :aria-label="field.label"
            :options="field.options"
            :disabled="busy"
            placeholder="Choose an option"
          /><PTextarea
            v-else-if="field.type === 'textarea'"
            :id="`wf-${field.key}`"
            v-model="values[field.key]"
            :required="field.required"
            :disabled="busy"
            rows="3"
            maxlength="2000"
          /><input
            v-else
            :id="`wf-${field.key}`"
            v-model="values[field.key]"
            :type="field.type"
            :required="field.required"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            :disabled="busy"
            :list="field.key.endsWith('Id') ? 'workflow-references' : undefined"
            maxlength="2000"
            @input="
              field.type === 'number' &&
              (values[field.key] = Number(($event.target as HTMLInputElement).value))
            "
          /><small v-if="field.help">{{ field.help }}</small></template
        >
      </div>
    </div>
    <datalist id="workflow-references">
      <option v-for="reference in references" :key="reference.id" :value="reference.id">
        {{ reference.name }}
      </option></datalist
    ><PButton :label="action.label" type="submit" :loading="busy" icon="pi pi-check" />
  </form>
</template>
