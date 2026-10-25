<script setup lang="ts">
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
      <PInputText
        id="form-department"
        v-model="values.department"
        placeholder="e.g. Engineering"
        :aria-invalid="!!errors.department"
        aria-describedby="error-department"
      />
      <small id="error-department" class="field-error">{{ errors.department }}</small>
    </div>

    <div class="field">
      <label for="form-position">Position</label>
      <PInputText
        id="form-position"
        v-model="values.position"
        placeholder="e.g. Software Engineer"
        :aria-invalid="!!errors.position"
        aria-describedby="error-position"
      />
      <small id="error-position" class="field-error">{{ errors.position }}</small>
    </div>
  </div>

  <div v-if="managerOptions.length" class="field">
    <label for="form-manager">Reporting manager</label>
    <PSelect
      input-id="form-manager"
      v-model="values.manager"
      :options="managerOptions"
      option-label="name"
      option-value="name"
      placeholder="Select a manager (optional)"
    />
  </div>
</template>
