<script setup lang="ts">
import { failureMessage } from '~/utils/failure'
const props = defineProps<{
  values: Record<string, any>
  errors: Record<string, string>
}>()

const api = useWorkspace()
const departments = useWorkspaceQuery('form-departments', () => api.list('departments'))
const positions = useWorkspaceQuery('form-positions', () => api.list('positions'))
const employees = useWorkspaceQuery('form-employees', () => api.list('employees'))

const departmentOptions = computed(() => departments.data.value?.items || [])
const positionOptions = computed(() => positions.data.value?.items || [])
const managerOptions = computed(() =>
  (employees.data.value?.items || []).filter((e) => e.name !== props.values.name),
)
</script>

<template>
  <div class="field">
    <label for="form-name">Full name</label>
    <PInputText
      id="form-name"
      v-model="values.name"
      :aria-invalid="!!errors.name"
      aria-describedby="error-name"
    />
    <small id="error-name" class="field-error">{{ errors.name }}</small>
  </div>

  <div class="field">
    <label for="form-email">Work email</label>
    <PInputText
      id="form-email"
      v-model="values.email"
      type="email"
      :aria-invalid="!!errors.email"
      aria-describedby="error-email"
    />
    <small id="error-email" class="field-error">{{ errors.email }}</small>
  </div>

  <div class="form-grid">
    <div class="field">
      <label for="form-employeeNo">Employee ID</label>
      <PInputText
        id="form-employeeNo"
        v-model="values.employeeNo"
        placeholder="e.g. EMP-001"
        :aria-invalid="!!errors.employeeNo"
        aria-describedby="error-employeeNo"
      />
      <small id="error-employeeNo" class="field-error">{{ errors.employeeNo }}</small>
    </div>

    <div class="field">
      <label for="form-hireDate">Hire date</label>
      <PInputText
        id="form-hireDate"
        v-model="values.hireDate"
        type="date"
        :aria-invalid="!!errors.hireDate"
        aria-describedby="error-hireDate"
      />
      <small id="error-hireDate" class="field-error">{{ errors.hireDate }}</small>
    </div>
  </div>

  <div class="form-grid">
    <div class="field">
      <label for="form-department">Department</label>
      <PSelect
        input-id="form-department"
        aria-label="Department"
        v-model="values.departmentId"
        :options="departmentOptions"
        :loading="departments.isPending.value"
        option-label="name"
        option-value="id"
        placeholder="Choose a department"
        :aria-invalid="!!errors.departmentId"
        aria-describedby="error-department"
      />
      <div v-if="departments.error.value" role="alert" class="field-error">
      {{ failureMessage(departments.error.value) }}
      <PButton label="Retry departments" text :loading="departments.isFetching.value" @click="departments.refetch()" />
    </div>
      <small v-if="departments.isSuccess.value && !departmentOptions.length">No departments are available. Add one in Organization.</small>
      <small id="error-department" class="field-error">{{ errors.departmentId }}</small>
    </div>

    <div class="field">
      <label for="form-position">Position</label>
      <PSelect
        input-id="form-position"
        aria-label="Position"
        v-model="values.positionId"
        :options="positionOptions"
        :loading="positions.isPending.value"
        option-label="name"
        option-value="id"
        placeholder="Choose a position"
        :aria-invalid="!!errors.positionId"
        aria-describedby="error-position"
      />
      <div v-if="positions.error.value" role="alert" class="field-error">
      {{ failureMessage(positions.error.value) }}
      <PButton label="Retry positions" text :loading="positions.isFetching.value" @click="positions.refetch()" />
    </div>
      <small id="error-position" class="field-error">{{ errors.positionId }}</small>
    </div>
  </div>

  <div v-if="managerOptions.length || employees.isPending.value || employees.error.value" class="field">
    <label for="form-manager">Reporting manager</label>
    <PSelect
      input-id="form-manager"
      aria-label="Reporting manager"
      v-model="values.managerId"
      :options="managerOptions"
      :loading="employees.isPending.value"
      option-label="name"
      option-value="id"
      placeholder="Select a manager (optional)"
    />
    <div v-if="employees.error.value" role="alert" class="field-error">
      {{ failureMessage(employees.error.value) }}
      <PButton label="Retry managers" text :loading="employees.isFetching.value" @click="employees.refetch()" />
    </div>
  </div>
</template>
