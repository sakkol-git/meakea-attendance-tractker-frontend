<script setup lang="ts">
import { initials } from '~/utils/format'
definePageMeta({ roles: ['MANAGER', 'HR_ADMIN', 'OWNER'] })
const api = useWorkspace()
const session = useSessionStore()
const search = ref('')
const add = ref(false)
const result = useWorkspaceQuery('people', () => api.list('employees'))
const rows = computed(() =>
  (result.data.value?.items || []).filter((x) =>
    [x.name, x.department, x.position, x.email]
      .join(' ')
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
)
</script>
<template>
  <PageHeading
    title="People"
    description="Meet the people who make your workspace work."
    eyebrow="BETTER TOGETHER"
    ><PButton v-if="session.isAdmin" label="Add a person" icon="pi pi-plus" @click="add = true"
  /></PageHeading>
  <section class="panel no-padding">
    <div class="table-toolbar">
      <h2>
        Your team <span class="count-badge">{{ result.data.value?.total ?? '—' }}</span>
      </h2>
      <div class="search-field">
        <AppIcon name="search" /><PInputText
          v-model="search"
          aria-label="Search people"
          placeholder="Search name, team or role"
        />
      </div>
    </div>
    <QueryState
      :pending="result.isPending.value"
      :error="result.error.value"
      :empty="!result.data.value?.items.length"
      title="Your people belong here"
      @retry="result.refetch()"
      ><div class="table-region" role="region" aria-label="People directory" tabindex="0">
        <PDataTable :value="rows" paginator :rows="10" data-key="id" table-style="min-width: 42rem"
          ><PColumn header="Person"
            ><template #body="{ data }"
              ><NuxtLink :to="`/people/${data.id}`" class="person-cell"
                ><span class="avatar">{{ initials(data.name || '') }}</span
                ><span
                  ><strong>{{ data.name }}</strong
                  ><small>{{ data.email }}</small></span
                ></NuxtLink
              ></template
            ></PColumn
          ><PColumn field="department" header="Department" sortable /><PColumn
            field="position"
            header="Position"
          /><PColumn header="Status"
            ><template #body="{ data }"><StatusBadge :status="data.status" /></template></PColumn
          ><PColumn header="Details"
            ><template #body="{ data }"
              ><NuxtLink
                :to="`/people/${data.id}`"
                :aria-label="`View ${data.name}`"
                class="text-link"
                >View<AppIcon name="arrow-up-right" /></NuxtLink></template></PColumn
          ><template #empty>No people match your search.</template></PDataTable
        >
      </div></QueryState
    >
  </section>
  <ResourceForm
    v-model:visible="add"
    kind="employee"
    @saved="(row) => navigateTo(`/people/${row.id}`)"
  />
</template>
