<script setup lang="ts">
import { workspaceTasks } from '~/features/workflows/tasks'
import { workflows } from '~/features/workflows/catalog'
import { filterRecords } from '~/utils/filter'
const session = useSessionStore()
const search = ref('')
const group = ref('All areas')
const tasks = computed(() => workspaceTasks(session.roles, session.mode))
const groups = computed(() => ['All areas', ...new Set(tasks.value.map((x) => x.group))])
const rows = computed(() => {
  const byGroup =
    group.value === 'All areas' ? tasks.value : tasks.value.filter((x) => x.group === group.value)
  return filterRecords(byGroup, ['id', 'title', 'purpose'], search.value)
})
</script>
<template>
  <PageHeading
    title="Tasks"
    description="Find a task for your workday, team or organization."
    eyebrow="YOUR WORKSPACE"
  />
  <div class="panel workflow-filter">
    <div class="field">
      <label for="workflow-search">Find a task</label
      ><PInputText
        id="workflow-search"
        v-model="search"
        placeholder="Search attendance, rollover, export…"
      />
    </div>
    <div class="field">
      <label for="workflow-group">Business area</label
      ><PSelect
        input-id="workflow-group"
        v-model="group"
        :options="groups"
        aria-label="Business area"
      />
    </div>
  </div>
  <p class="small-note workflow-caption">
    {{ rows.length }} tasks available for your workspace role.
  </p>
  <div class="workflow-grid">
    <NuxtLink v-for="flow in rows" :key="flow.id" :to="flow.to" class="panel workflow-card"
      ><div>
        <span class="eyebrow">{{ flow.group }}</span
        ><AppIcon name="arrow-up-right" />
      </div>
      <h2>{{ flow.title }}</h2>
      <p>{{ flow.purpose }}</p>
      <span class="small-note">Open task</span></NuxtLink
    >
  </div>
  <section v-if="!rows.length" class="empty-state panel">
    <h2>No matching tasks</h2>
    <p>Try a different term or business area.</p>
  </section>
  <details v-if="session.mode === 'local'" class="panel demo-catalog">
    <summary>Developer demo catalog</summary>
    <p>
      All 40 documented journeys use synthetic data. This catalog is only available in demo mode.
    </p>
    <div class="workflow-grid">
      <NuxtLink
        v-for="flow in workflows.filter((flow) => !rows.some((task) => task.id === flow.id))"
        :key="flow.id"
        :to="`/workflows/${flow.id}`"
        class="text-link"
        >{{ flow.id }} · {{ flow.title }}</NuxtLink
      >
    </div>
  </details>
</template>
