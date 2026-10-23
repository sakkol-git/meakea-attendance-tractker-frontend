<script setup lang="ts">
defineProps<{ error: { statusCode?: number; message?: string } }>()
</script>
<template>
  <main class="error-page">
    <span class="brand">HRFlow.</span>
    <h1>
      {{
        error.statusCode === 404 ? 'This page has wandered off.' : 'Something needs a closer look.'
      }}
    </h1>
    <p>
      {{
        error.statusCode === 404
          ? 'The page may have moved, or the address may be incomplete.'
          : 'Your last action may not have completed. Review your records before repeating a change.'
      }}
    </p>
    <PButton label="Back to workspace" @click="clearError({ redirect: '/' })" />
  </main>
</template>
