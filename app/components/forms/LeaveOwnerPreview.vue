<script setup lang="ts">
import { failureMessage } from '~/utils/failure'

const props = defineProps<{ values: Record<string, any> }>()
const api = useWorkspace()
const input = computed(() => ({
  type: String(props.values.type || ''),
  startDate: String(props.values.startDate || ''),
  endDate: String(props.values.endDate || ''),
  portion: String(props.values.portion || 'FULL_DAY'),
}))
const complete = computed(
  () =>
    !!input.value.type &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.value.startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.value.endDate),
)
const preview = useWorkspaceQuery(
  () => `leave-preview:${JSON.stringify(input.value)}`,
  () => (complete.value ? api.leave.preview(input.value) : Promise.resolve(null)),
)
</script>

<template>
  <p v-if="complete && preview.isPending.value" role="status">
    Calculating your assigned working days…
  </p>
  <p v-else-if="preview.error.value" role="alert" class="field-error">
    {{ failureMessage(preview.error.value) }}
  </p>
  <div v-else-if="preview.data.value" class="gentle-note form-note" role="status">
    <AppIcon name="clock" />
    <div>
      <strong
        >{{ preview.data.value.chargeableDays }}
        {{ preview.data.value.chargeableDays === 1 ? 'working day' : 'working days' }}</strong
      >
      <p v-if="!preview.data.value.balanceTracked">Balance: Not tracked</p>
      <p v-else>
        Balance: {{ preview.data.value.balanceBefore }} → {{ preview.data.value.balanceAfter }}
      </p>
      <p v-for="warning in preview.data.value.warnings" :key="warning">{{ warning }}</p>
      <p v-if="preview.data.value.evidenceRequired">
        This leave type requires supporting evidence.
      </p>
    </div>
  </div>
</template>
