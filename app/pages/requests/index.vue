<script setup lang="ts">
const api = useWorkspace()
const records = useWorkspaceQuery('requests', () => api.list('myRequests'))
const visible = ref(false)
</script>
<template>
  <PageHeading
    title="Requests"
    description="The things you need, with a clear path forward."
    eyebrow="A LITTLE SUPPORT GOES A LONG WAY"
    ><PButton label="New request" icon="pi pi-plus" @click="visible = true"
  /></PageHeading>
  <div class="info-banner">
    <span class="record-icon violet"><AppIcon name="briefcase" /></span>
    <div>
      <strong>Your workspace, working for you.</strong>
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
      ><RequestTable :rows="records.data.value?.items || []" kind="request" /><template #empty
        ><PButton label="Create a request" @click="visible = true" /></template
    ></QueryState>
  </section>
  <ResourceForm
    v-model:visible="visible"
    kind="request"
    @saved="(row) => navigateTo(`/requests/${row.id}`)"
  />
</template>
