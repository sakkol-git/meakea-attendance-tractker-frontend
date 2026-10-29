<script setup lang="ts">
defineProps<{ references: { id: string; name: string }[] }>()
</script>
<template>
  <aside class="panel">
    <h2>Available records</h2>
    <p class="small-note workflow-intro">
      Choose the employee or record by name in the form. Changes are checked against the latest
      saved version.
    </p>
    <div v-for="record in references" :key="record.id" class="workflow-reference">
      <strong>{{ record.name }}</strong>
    </div>
    <p v-if="!references.length" class="small-note">No additional records to select.</p>
  </aside>
</template>
