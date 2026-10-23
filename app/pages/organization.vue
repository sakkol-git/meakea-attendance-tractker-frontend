<script setup lang="ts">
import type { EntityRow, Resource } from '~/types/workspace'
import { useConfirm } from 'primevue/useconfirm'
definePageMeta({ roles: ['HR_ADMIN', 'OWNER'] })
const api = useWorkspace()
const confirm = useConfirm()
const feedback = useFeedback()
const tab = ref<Resource>('departments')
const editing = ref<EntityRow>()
const visible = ref(false)
const search = ref('')
const categories: { label: string; value: Resource; icon: string }[] = [
  { label: 'Departments', value: 'departments', icon: 'sitemap' },
  { label: 'Positions', value: 'positions', icon: 'id-card' },
  { label: 'Shifts', value: 'shifts', icon: 'clock' },
  { label: 'Holidays', value: 'holidays', icon: 'sun' },
  { label: 'Work sites', value: 'workSites', icon: 'map-marker' },
  { label: 'Materials', value: 'materials', icon: 'box' },
]
const queries = Object.fromEntries(
  categories.map((x) => [x.value, useWorkspaceQuery(x.value, () => api.list(x.value))]),
)
const result = computed(() => queries[tab.value]!)
const rows = computed(
  () =>
    result.value.data.value?.items.filter((x) =>
      `${x.name} ${x.description || ''}`.toLowerCase().includes(search.value.toLowerCase()),
    ) || [],
)
function open(row?: EntityRow) {
  editing.value = row
  visible.value = true
}
function remove(row: EntityRow) {
  confirm.require({
    header: `Delete ${row.name}?`,
    message:
      'Check that this record is no longer used. The server must reject deletion if dependent records exist.',
    acceptLabel: 'Delete record',
    rejectLabel: 'Keep record',
    acceptProps: { severity: 'danger' },
    accept: () =>
      feedback.run(
        () => api.change(tab.value, row.id, '', row.version, undefined, 'DELETE'),
        'Record deleted',
      ),
  })
}
watch(tab, () => {
  search.value = ''
  visible.value = false
})
</script>
<template>
  <PageHeading
    title="Organization"
    description="The foundations of a well-connected workplace."
    eyebrow="MAKE YOURSELF AT HOME"
    ><PButton label="Add a record" icon="pi pi-plus" @click="open()"
  /></PageHeading>
  <div class="segmented-tabs wrap" role="group" aria-label="Organization category">
    <button
      v-for="item in categories"
      :key="item.value"
      :aria-pressed="tab === item.value"
      :class="{ selected: tab === item.value }"
      @click="tab = item.value"
    >
      <AppIcon :name="item.icon" />{{ item.label }}
    </button>
  </div>
  <section class="panel no-padding">
    <div class="table-toolbar">
      <h2>{{ categories.find((x) => x.value === tab)?.label }}</h2>
      <PInputText
        v-model="search"
        aria-label="Search organization records"
        placeholder="Search records…"
      />
    </div>
    <QueryState
      :pending="result.isPending.value"
      :error="result.error.value"
      :empty="!result.data.value?.items.length"
      title="Room to grow"
      message="Create the first record in this category."
      @retry="result.refetch()"
      ><div class="table-region" role="region" aria-label="Organization records" tabindex="0">
        <PDataTable :value="rows" paginator :rows="10" data-key="id" table-style="min-width: 38rem"
          ><PColumn field="name" header="Name" sortable /><PColumn
            field="description"
            header="Description"
          /><PColumn v-if="tab === 'holidays'" field="date" header="Date" /><PColumn
            v-if="tab === 'shifts'"
            header="Hours"
            ><template #body="{ data }">{{ data.start }} – {{ data.end }}</template></PColumn
          ><PColumn
            v-if="tab === 'materials'"
            field="quantity"
            header="Available quantity"
          /><PColumn header="Actions"
            ><template #body="{ data }"
              ><div class="inline-actions">
                <PButton
                  icon="pi pi-pencil"
                  text
                  :aria-label="`Edit ${data.name}`"
                  @click="open(data)"
                /><PButton
                  icon="pi pi-trash"
                  text
                  severity="danger"
                  :aria-label="`Delete ${data.name}`"
                  :disabled="feedback.busy.value"
                  @click="remove(data)"
                /></div></template></PColumn
          ><template #empty>No records match your search.</template></PDataTable
        >
      </div></QueryState
    >
  </section>
  <ResourceForm
    v-model:visible="visible"
    kind="master"
    :path="tab"
    :initial="editing"
    :heading="`${editing ? 'Edit' : 'Add'} ${categories.find((x) => x.value === tab)?.label.toLowerCase()}`"
  />
</template>
