<script setup lang="ts">
import { z } from 'zod'
import { useConfirm } from 'primevue/useconfirm'
import { leaveForm, requestForm, correctionForm, employeeForm } from '~/schemas/forms'
import type { EntityRow, Resource } from '~/types/workspace'
import type { RecordData } from '~/data/source'

import LeaveFormFields from '~/components/forms/LeaveFormFields.vue'
import EmployeeFormFields from '~/components/forms/EmployeeFormFields.vue'
import RequestFormFields from '~/components/forms/RequestFormFields.vue'
import CorrectionFormFields from '~/components/forms/CorrectionFormFields.vue'
import MasterFormFields from '~/components/forms/MasterFormFields.vue'

const props = defineProps<{
  visible: boolean
  kind: 'leave' | 'request' | 'correction' | 'employee' | 'master'
  initial?: EntityRow
  path?: Resource
  heading?: string
}>()

const emit = defineEmits<{ 'update:visible': [boolean]; saved: [EntityRow] }>()

const api = useWorkspace()
const feedback = useFeedback()
const confirm = useConfirm()

const values = reactive<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
let snapshot = ''

const titles = {
  leave: 'Request time off',
  request: 'Create a request',
  correction: 'Report an attendance issue',
  employee: 'Add a person',
  master: 'Add a record',
}

const title = computed(
  () =>
    props.heading ||
    (props.initial
      ? 'Edit ' + (props.kind === 'employee' ? 'person' : 'record')
      : titles[props.kind]),
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    Object.keys(values).forEach((k) => delete values[k])
    Object.assign(values, {
      type: '',
      portion: 'FULL_DAY',
      startDate: '',
      endDate: '',
      reason: '',
      title: '',
      quantity: 1,
      materialId: '',
      fromTime: '08:30',
      toTime: '17:30',
      date: '',
      name: '',
      email: '',
      employeeNo: '',
      hireDate: '',
      department: '',
      position: '',
      manager: '',
      description: '',
      start: '09:00',
      end: '17:00',
      ...props.initial,
    })
    errors.value = {}
    feedback.error.value = ''
    snapshot = JSON.stringify(values)
  },
  { immediate: true },
)

function close() {
  if (feedback.busy.value) return
  if (JSON.stringify(values) !== snapshot) {
    confirm.require({
      header: 'Discard your changes?',
      message: 'Your unsaved changes will be lost.',
      rejectLabel: 'Keep editing',
      acceptLabel: 'Discard changes',
      acceptProps: { severity: 'danger' },
      accept: () => emit('update:visible', false),
    })
    return
  }
  emit('update:visible', false)
}

async function save() {
  const master = z.object({
    name: z.string().trim().min(2, 'Enter a name.'),
    description: z.string().max(2000).optional(),
    ...(props.path === 'holidays'
      ? { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.') }
      : {}),
    ...(props.path === 'materials' ? { quantity: z.number().int().min(0).max(1000000) } : {}),
    ...(props.path === 'shifts' ? { start: z.string().min(1), end: z.string().min(1) } : {}),
  })

  const schema = {
    leave: leaveForm,
    request: requestForm,
    correction: correctionForm,
    employee: employeeForm,
    master,
  }[props.kind]

  const parsed = schema.safeParse(values)
  errors.value = {}

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.value[String(issue.path[0])] = issue.message
    }
    nextTick(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    return
  }

  const paths: Record<typeof props.kind, Resource> = {
    leave: 'leaves',
    request: 'requests',
    correction: 'corrections',
    employee: 'employees',
    master: props.path || 'departments',
  }

  let body = JSON.parse(JSON.stringify(parsed.data)) as RecordData
  if (props.kind === 'leave') {
    const leaveTypeIds: Record<string, string> = {
      'Annual leave': 'annual',
      'Sick leave': 'sick',
      'Personal leave': 'personal',
    }
    body.leaveTypeId = leaveTypeIds[String(body.type)] || null
  }
  if (props.kind === 'request') {
    const type = String(body.type)
    const materialId = String(body.materialId || '')
    const reason = String(body.reason || '')
    const quantity = Number(body.quantity || 1)
    body = {
      title: String(body.title || ''),
      type,
      reason,
      description: reason,
      quantity: type === 'MATERIAL' ? quantity : null,
      items: type === 'MATERIAL' && materialId ? [{ materialId, quantity }] : [],
      ...(['REMOTE_WORK', 'LATE_ARRIVAL', 'EARLY_LEAVE'].includes(type)
        ? { startDate: String(body.startDate || ''), endDate: String(body.endDate || '') }
        : { startDate: null, endDate: null }),
      ...(['LATE_ARRIVAL', 'EARLY_LEAVE'].includes(type)
        ? { fromTime: String(body.fromTime || ''), toTime: String(body.toTime || '') }
        : { fromTime: null, toTime: null }),
    }
  }

  const result = await feedback.run(
    async () =>
      props.initial
        ? api.update(paths[props.kind], props.initial.id, props.initial.version, body)
        : api.create(paths[props.kind], body),
    props.initial ? 'Changes saved' : props.kind === 'request' ? 'Draft saved' : 'Request recorded',
  )

  if (result) {
    emit('saved', result)
    emit('update:visible', false)
  }
}
</script>

<template>
  <PDialog
    :visible="visible"
    modal
    :header="title"
    class="dialog-lg"
    :breakpoints="{ '640px': '95vw' }"
    :closable="!feedback.busy.value"
    @update:visible="close"
  >
    <p class="dialog-intro">
      {{
        kind === 'leave'
          ? 'Make a little space for what matters. Your approver will review the dates below.'
          : kind === 'request'
            ? 'Save a draft first, then review and submit it to your approver.'
            : kind === 'correction'
              ? 'Tell us what needs a closer look. Your original attendance record stays unchanged until reviewed.'
              : 'Keep your workspace information clear and up to date.'
      }}
    </p>

    <form class="app-form" novalidate @submit.prevent="save">
      <LeaveFormFields v-if="kind === 'leave'" :values="values" :errors="errors" />

      <EmployeeFormFields v-else-if="kind === 'employee'" :values="values" :errors="errors" />

      <RequestFormFields v-else-if="kind === 'request'" :values="values" :errors="errors" />

      <CorrectionFormFields v-else-if="kind === 'correction'" :values="values" :errors="errors" />

      <MasterFormFields
        v-else-if="kind === 'master'"
        :values="values"
        :errors="errors"
        :path="path"
      />

      <p v-if="feedback.error.value" class="form-error" role="alert">
        {{ feedback.error.value }}
      </p>

      <footer class="dialog-actions">
        <PButton
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="feedback.busy.value"
          @click="close"
        />
        <PButton
          type="submit"
          :label="
            initial
              ? 'Save changes'
              : kind === 'request'
                ? 'Save draft'
                : kind === 'leave'
                  ? 'Send request'
                  : kind === 'employee' || kind === 'master'
                    ? 'Create record'
                    : 'Submit for review'
          "
          :loading="feedback.busy.value"
        />
      </footer>
    </form>
  </PDialog>
</template>
