<script setup lang="ts">
const api = useWorkspace()
const requests = useWorkspaceQuery('leave', () => api.list('myLeaves'))
const balances = useWorkspaceQuery('balances', () => api.balances())
const visible = ref(false)
</script>
<template>
  <PageHeading
    title="Time off"
    description="A little space to recharge. Manage your leave and see what’s ahead."
    eyebrow="YOUR TIME, WELL SPENT"
    ><PButton label="Request time off" icon="pi pi-plus" @click="visible = true"
  /></PageHeading>
  <div class="balance-grid">
    <QueryState
      :pending="balances.isPending.value"
      :error="balances.error.value"
      @retry="balances.refetch()"
      ><section
        v-for="(balance, i) in balances.data.value?.items"
        :key="balance.type"
        class="panel balance-card"
      >
        <span class="record-icon" :class="['leave', 'blue', 'violet'][i % 3]"
          ><AppIcon :name="['sun', 'heart', 'coffee'][i % 3]!"
        /></span>
        <div>
          <h2>{{ balance.type }}</h2>
          <strong
            >{{ balance.available }}<small>{{ balance.unit }} available</small></strong
          >
          <p>{{ balance.pending }} pending · {{ balance.year }}</p>
        </div>
      </section></QueryState
    >
  </div>
  <section class="panel no-padding">
    <div class="section-heading padded">
      <div>
        <h2>Your requests</h2>
        <p>From the first plan to the final approval</p>
      </div>
    </div>
    <QueryState
      :pending="requests.isPending.value"
      :error="requests.error.value"
      :empty="!requests.data.value?.items.length"
      title="Your next break starts here"
      message="When you request time off, you can follow its progress here."
      @retry="requests.refetch()"
      ><RequestTable :rows="requests.data.value?.items || []" kind="leave" /><template #empty
        ><PButton label="Request time off" @click="visible = true" /></template
    ></QueryState>
  </section>
  <ResourceForm
    v-model:visible="visible"
    kind="leave"
    @saved="(row) => navigateTo(`/leave/${row.id}`)"
  />
</template>
