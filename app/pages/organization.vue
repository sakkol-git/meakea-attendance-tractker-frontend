<script setup lang="ts">
import type { EntityRow, Resource } from '~/types/workspace'
import { useConfirm } from 'primevue/useconfirm'
import { filterRecords } from '~/utils/filter'
definePageMeta({ roles: ['HR_ADMIN', 'OWNER'] })
const api = useWorkspace()
const confirm = useConfirm()
const feedback = useFeedback()
type OrgTab = Resource | 'orgChart'

const tab = ref<OrgTab>('departments')
const editing = ref<EntityRow>()
const visible = ref(false)
const bulkImport = ref(false)
const search = ref('')
const categories: { label: string; value: OrgTab; icon: string }[] = [
  { label: 'Departments', value: 'departments', icon: 'sitemap' },
  { label: 'Positions', value: 'positions', icon: 'id-card' },
  { label: 'Org chart', value: 'orgChart', icon: 'users' },
  { label: 'Shifts', value: 'shifts', icon: 'clock' },
  { label: 'Holidays', value: 'holidays', icon: 'sun' },
  { label: 'Work sites', value: 'workSites', icon: 'map-marker' },
  { label: 'Materials', value: 'materials', icon: 'box' },
]
const queries = Object.fromEntries(
  categories
    .filter((x) => x.value !== 'orgChart')
    .map((x) => [x.value, useWorkspaceQuery(x.value, () => api.list(x.value as Resource))]),
)
const activeResource = computed<Resource>(() =>
  tab.value === 'orgChart' ? 'departments' : (tab.value as Resource),
)
const result = computed(() => queries[activeResource.value]!)
const rows = computed(() =>
  filterRecords(result.value.data.value?.items || [], ['name', 'description'], search.value),
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
        () => api.change(tab.value as Resource, row.id, '', row.version, undefined, 'DELETE'),
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
  >
    <div v-if="tab !== 'orgChart'" class="heading-actions">
      <NuxtLink v-if="tab === 'shifts'" to="/workflows/BF-005">
        <PButton label="Assign shift" icon="pi pi-user-plus" outlined />
      </NuxtLink>
      <PButton label="Bulk import" icon="pi pi-upload" outlined @click="bulkImport = true" />
      <PButton label="Add a record" icon="pi pi-plus" @click="open()" />
    </div>
  </PageHeading>
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
  <section v-if="tab === 'orgChart'" class="panel">
    <OrgChart />
  </section>
  <section v-else class="panel no-padding">
    <div class="table-toolbar">
      <h2>{{ categories.find((x) => x.value === tab)?.label }}</h2>
      <div class="search-field">
        <AppIcon name="search" /><PInputText
          v-model="search"
          aria-label="Search organization records"
          placeholder="Search records…"
        />
      </div>
    </div>
    <QueryState
      :pending="result.isPending.value"
      :error="result.error.value"
      :empty="!result.data.value?.items.length"
      title="Room to grow"
      message="Create the first record in this category."
      @retry="result.refetch()"
      ><div class="table-region" role="region" aria-label="Organization records" tabindex="0">
        <PDataTable :value="rows" paginator :rows="10" data-key="id" class="table-org"
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
    :path="activeResource"
    :initial="editing"
    :heading="`${editing ? 'Edit' : 'Add'} ${categories.find((x) => x.value === tab)?.label.toLowerCase()}`"
  />
  <BulkImportDialog
    v-if="tab !== 'orgChart'"
    v-model:visible="bulkImport"
    :resource="tab as Resource"
    :title="`Bulk import ${categories.find((x) => x.value === tab)?.label.toLowerCase()}`"
    @imported="() => result?.refetch()"
  />
</template>
