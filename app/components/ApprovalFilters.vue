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
  <div class="panel approval-filters" role="group" aria-label="Approval filters">
    <div class="field approval-search">
      <label for="approval-search">Find a request</label>
      <div class="search-field">
        <AppIcon name="search" />
        <PInputText
          v-model="search"
          id="approval-search"
          type="search"
          placeholder="Search approvals…"
          aria-label="Search approvals"
        />
      </div>
    </div>
    <div class="field">
      <label for="approval-status">Status</label>
      <PSelect
        input-id="approval-status"
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
    </div>
    <div class="field">
      <label for="approval-age">Waiting time</label>
      <PSelect
        input-id="approval-age"
        v-model="minAgeDays"
        aria-label="Filter waiting age"
        :options="ageOptions"
        option-label="label"
        option-value="value"
      />
    </div>
    <div class="field">
      <label for="approval-sort">Sort by</label>
      <PSelect
        input-id="approval-sort"
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
  </div>
</template>

<style scoped>
.approval-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) minmax(140px, 1fr) minmax(180px, 1fr) minmax(
      150px,
      1fr
    );
  align-items: end;
  gap: var(--space-4);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
.field,
.search-field {
  min-width: 0;
  margin: 0;
}
.search-field {
  width: 100%;
}
.field :deep(.p-inputtext),
.field :deep(.p-select) {
  width: 100%;
  min-height: var(--control-height);
}
.field :deep(.p-inputtext) {
  padding-block: var(--space-2);
}
@media (max-width: 1100px) {
  .approval-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 540px) {
  .approval-filters {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
