<script setup lang="ts">
import { workflows } from '~/features/workflows/catalog'
const session = useSessionStore()
const search = ref('')
const group = ref('All areas')
const groups = ['All areas', ...new Set(workflows.map((x) => x.group))]
const rows = computed(() =>
  workflows.filter(
    (x) =>
      (group.value === 'All areas' || x.group === group.value) &&
      `${x.id} ${x.title} ${x.purpose}`.toLowerCase().includes(search.value.toLowerCase()),
  ),
)
const allowed = (roles: string[]) => session.roles.some((x) => roles.includes(x))
</script>
<template>
  <PageHeading
    title="Business workflows"
    description="Every documented journey, with its actions, evidence and operational boundary."
    eyebrow="40 SOURCE-MAPPED WORKFLOWS"
  />
  <div class="panel workflow-filter">
    <div class="field">
      <label for="workflow-search">Find a workflow</label
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
    {{ rows.length }} workflows · Access follows your current role. Operator and ML screens are
    explicit demo previews, never production operator grants.
  </p>
  <div class="workflow-grid">
    <NuxtLink
      v-for="flow in rows"
      :key="flow.id"
      :to="`/workflows/${flow.id}`"
      class="panel workflow-card"
      ><div>
        <span class="eyebrow">{{ flow.id }} · {{ flow.group }}</span
        ><AppIcon :name="allowed(flow.roles) ? 'arrow-up-right' : 'lock'" />
      </div>
      <h2>{{ flow.title }}</h2>
      <p>{{ flow.purpose }}</p>
      <span class="small-note">{{
        allowed(flow.roles)
          ? 'Open workflow'
          : 'Requires ' + flow.roles.map((x) => x.replaceAll('_', ' ')).join(' / ')
      }}</span></NuxtLink
    >
  </div>
  <section v-if="!rows.length" class="empty-state panel">
    <h2>No matching workflows</h2>
    <p>Try a different term or business area.</p>
  </section>
</template>
