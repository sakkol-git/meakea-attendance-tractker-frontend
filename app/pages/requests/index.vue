<script setup lang="ts">
const api = useWorkspace()
const views = useListViewsStore()
const page = computed({
  get: () => views.forList('request').page,
  set: (value) => {
    views.forList('request').page = value
  },
})
const pageSize = 25
const records = useWorkspaceQuery(
  () => `requests:${page.value}`,
  () =>
    api.list(
      'myRequests',
      api.mode === 'remote' ? { page: page.value, size: pageSize } : undefined,
    ),
)
const visible = ref(false)
</script>
<template>
  <PageHeading
    title="Requests"
    description="Create a draft, send it for approval and track the result."
    ><PButton label="New request" icon="pi pi-plus" @click="visible = true"
  /></PageHeading>
  <div class="info-banner">
    <span class="record-icon violet"><AppIcon name="briefcase" /></span>
    <div>
      <strong>Start with a draft</strong>
      <p>
        Equipment, remote work, and general requests. Save a draft, review the details, and send it
        when you’re ready.
      </p>
    </div>
  </div>
  <section class="panel no-padding">
    <div class="section-heading padded"><h2>Your requests</h2></div>
    <QueryState
      :pending="records.isPending.value"
      :error="records.error.value"
      :empty="!records.data.value?.items.length"
      title="What would make work a little better?"
      message="Create a request and follow its progress here."
      @retry="records.refetch()"
      ><RequestTable
        :rows="records.data.value?.items || []"
        kind="request"
        :server-page="api.mode === 'remote'" /><template #empty
        ><PButton label="Create a request" @click="visible = true" /></template
    ></QueryState>
  </section>
  <CollectionPager
    v-if="api.mode === 'remote'"
    v-model:page="page"
    :size="pageSize"
    :total="records.data.value?.total ?? 0"
  />
  <ResourceForm
    v-model:visible="visible"
    kind="request"
    @saved="(row) => navigateTo(`/requests/${row.id}`)"
  />
</template>
