<script setup lang="ts">
const search = defineModel<string>('search', { required: true })
const status = defineModel<string>('status', { required: true })
const sort = defineModel<'oldest' | 'newest'>('sort', { required: true })
const minAgeDays = defineModel<number>('minAgeDays', { required: true })

const ageOptions = [
  { label: 'Any waiting age', value: 0 },
  { label: 'Waiting at least 1 day', value: 1 },
  { label: 'Waiting at least 3 days', value: 3 },
  { label: 'Waiting at least 7 days', value: 7 },
]
</script>

<template>
  <div class="table-toolbar approval-filters" aria-label="Approval filters">
    <div class="search-field">
      <AppIcon name="search" />
      <PInputText v-model="search" placeholder="Search approvals…" aria-label="Search approvals" />
    </div>
    <PSelect
      v-model="status"
      aria-label="Filter approval status"
      :options="[
        { label: 'Pending', value: 'PENDING' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' },
      ]"
      option-label="label"
      option-value="value"
    />
    <PSelect
      v-model="minAgeDays"
      aria-label="Filter waiting age"
      :options="ageOptions"
      option-label="label"
      option-value="value"
    />
    <PSelect
      v-model="sort"
      aria-label="Sort approvals"
      :options="[
        { label: 'Oldest first', value: 'oldest' },
        { label: 'Newest first', value: 'newest' },
      ]"
      option-label="label"
      option-value="value"
    />
  </div>
</template>
