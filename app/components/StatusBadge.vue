<script setup lang="ts">
import { titleCase } from '~/utils/format'
const props = defineProps<{ status?: string }>()
const severity = computed(
  () =>
    ({
      APPROVED: 'success',
      ACTIVE: 'success',
      FULFILLED: 'success',
      COMPLETED: 'success',
      PENDING: 'warn',
      DRAFT: 'secondary',
      REJECTED: 'danger',
      CANCELLED: 'secondary',
      INACTIVE: 'secondary',
    })[props.status || ''] || 'info',
)
</script>
<template><PTag :value="titleCase(status)" :severity="severity" rounded /></template>
