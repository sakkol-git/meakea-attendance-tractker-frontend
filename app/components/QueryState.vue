<script setup lang="ts">
defineProps<{
  pending?: boolean
  error?: unknown
  empty?: boolean
  title?: string
  message?: string
}>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div v-if="pending" class="loading-stack" role="status" aria-label="Loading content">
    <PSkeleton height="2rem" width="40%" /><PSkeleton height="5rem" /><PSkeleton
      height="5rem"
    /><span class="sr-only">Loading your workspace…</span>
  </div>
  <div v-else-if="error" class="empty-state error-state" role="alert">
    <span class="state-icon"><AppIcon name="exclamation-circle" /></span>
    <h2>We couldn’t load this</h2>
    <p>
      {{ error instanceof Error ? error.message : 'Please check your connection and try again.' }}
    </p>
    <PButton label="Try again" icon="pi pi-refresh" outlined @click="$emit('retry')" />
  </div>
  <div v-else-if="empty" class="empty-state">
    <span class="state-icon"><AppIcon name="inbox" /></span>
    <h2>{{ title || 'Nothing here yet' }}</h2>
    <p>{{ message || 'New records will appear here when they are available.' }}</p>
    <slot name="empty" />
  </div>
  <slot v-else />
</template>
