<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
import { initials } from '~/utils/format'
definePageMeta({ roles: ['MANAGER', 'HR_ADMIN', 'OWNER'] })
const route = useRoute()
const api = useWorkspace()
const session = useSessionStore()
const edit = ref(false)
const feedback = useFeedback()
const confirm = useConfirm()
const id = String(route.params.id)
const result = useWorkspaceQuery(`person-${id}`, () => api.detail('employees', id))
const row = computed(() => result.data.value?.row)
function deactivate() {
  confirm.require({
    header: 'Deactivate this person?',
    message:
      'Review offboarding requirements with HR before proceeding. This action changes their employment status.',
    acceptLabel: 'Deactivate',
    rejectLabel: 'Go back',
    acceptProps: { severity: 'danger' },
    accept: () =>
      feedback.run(
        () => api.change('employees', id, 'terminate', row.value!.version),
        'Person deactivated',
      ),
  })
}
</script>
<template>
  <NuxtLink class="back-link" to="/people"><AppIcon name="arrow-left" />All people</NuxtLink
  ><QueryState
    :pending="result.isPending.value"
    :error="result.error.value"
    @retry="result.refetch()"
    ><template v-if="row"
      ><PageHeading :title="row.name || 'Person'" :description="row.position"
        ><PButton
          v-if="session.isAdmin"
          label="Edit details"
          outlined
          icon="pi pi-pencil"
          @click="edit = true"
      /></PageHeading>
      <section class="panel profile-panel">
        <span class="avatar large">{{ initials(row.name || '') }}</span>
        <div>
          <h2>{{ row.name }}</h2>
          <p>{{ row.department }}</p>
          <StatusBadge :status="row.status" />
        </div>
        <dl class="detail-list">
          <div v-if="row.employeeNo">
            <dt>Employee ID</dt>
            <dd>
              <span class="text-mono">{{ row.employeeNo }}</span>
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{{ row.email }}</dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd>{{ row.position }}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{{ row.department }}</dd>
          </div>
          <div v-if="row.hireDate">
            <dt>Hire date</dt>
            <dd>{{ row.hireDate }}</dd>
          </div>
          <div>
            <dt>Record revision</dt>
            <dd>{{ row.version }}</dd>
          </div>
        </dl>
        <div v-if="session.isAdmin" class="inline-actions profile-actions">
          <NuxtLink :to="{ path: '/workflows/BF-005', query: { employee: id } }">
            <PButton label="Assign shift" icon="pi pi-clock" outlined size="small" />
          </NuxtLink>
          <PButton
            v-if="row.status !== 'INACTIVE' && id !== session.profile?.employeeId"
            label="Deactivate person"
            severity="danger"
            outlined
            size="small"
            :loading="feedback.busy.value"
            @click="deactivate"
          />
        </div>
      </section>
      <ResourceForm v-model:visible="edit" kind="employee" :initial="row" /></template
  ></QueryState>
</template>
