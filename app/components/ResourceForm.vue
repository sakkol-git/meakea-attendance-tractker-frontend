<script setup lang="ts">
import { requestDraftValues } from '~/utils/request-form'
import { formCopy } from '~/utils/form-copy'
import { focusInvalidField } from '~/utils/form-focus'
import { z } from 'zod'
import { useConfirm } from 'primevue/useconfirm'
import {
  leaveForm,
  requestForm,
  correctionForm,
  employeeForm,
  workSiteForm,
  shiftForm,
} from '~/schemas/forms'
import type { EntityRow, Resource } from '~/types/workspace'
import type { RecordData } from '~/data/source'

import LeaveFormFields from '~/components/forms/LeaveFormFields.vue'
import FormReview from '~/components/forms/FormReview.vue'
import EmployeeFormFields from '~/components/forms/EmployeeFormFields.vue'
import RequestFormFields from '~/components/forms/RequestFormFields.vue'
import CorrectionFormFields from '~/components/forms/CorrectionFormFields.vue'
import MasterFormFields from '~/components/forms/MasterFormFields.vue'
import ScheduleFormFields from '~/components/forms/ScheduleFormFields.vue'

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
const formElement = ref<HTMLFormElement>()
const formId = useId()
let snapshot = ''

const title = computed(
  () =>
    props.heading ||
    (props.initial
      ? 'Edit ' + (props.kind === 'employee' ? 'person' : 'record')
      : formCopy[props.kind].title),
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
      proposedClockIn: '',
      proposedClockOut: '',
      kind: 'COMPANY',
      name: '',
      email: '',
      employeeNo: '',
      hireDate: '',
      departmentId: '',
      positionId: '',
      managerId: '',
      description: '',
      start: '09:00',
      end: '17:00',
      startTime: '09:00',
      endTime: '17:00',
      graceMinutes: 10,
      workingDays: 31,
      siteId: '',
      latitude: '',
      longitude: '',
      radiusM: '',
      timezone: '',
      ...(props.kind === 'request' && props.initial
        ? requestDraftValues(props.initial)
        : props.initial),
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
      ? {
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
          kind: z.enum(['PUBLIC', 'COMPANY']),
        }
      : {}),
    ...(props.path === 'materials' ? { quantity: z.number().int().min(0).max(1000000) } : {}),
    ...(props.path === 'shifts' ? { start: z.string().min(1), end: z.string().min(1) } : {}),
  })

  const schema = {
    leave: leaveForm,
    request: requestForm,
    correction: correctionForm,
    employee: employeeForm,
    master:
      props.path === 'workSites' ? workSiteForm : props.path === 'shifts' ? shiftForm : master,
  }[props.kind]

  const parsed = schema.safeParse(values)
  errors.value = {}

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.value[String(issue.path[0])] = issue.message
    }
    nextTick(() => focusInvalidField(formElement.value))
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
  if (props.kind === 'correction') {
    if (!body.proposedClockIn) delete body.proposedClockIn
    if (!body.proposedClockOut) delete body.proposedClockOut
  }
  if (props.kind === 'leave' && api.mode === 'local') {
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
    const additional = Array.isArray(props.initial?.items) ? props.initial.items.slice(1) : []
    const requestItems =
      type === 'MATERIAL' && materialId ? [{ materialId, quantity }, ...additional] : []
    body = {
      title: String(body.title || ''),
      type,
      reason,
      description: reason,
      quantity:
        type === 'MATERIAL'
          ? requestItems.reduce((total, item) => total + Number(item.quantity), 0)
          : null,
      items: requestItems,
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
    props.initial ? 'Changes saved' : formCopy[props.kind].saved,
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
      {{ formCopy[kind].intro }}
    </p>

    <form
      ref="formElement"
      :id="formId"
      class="app-form"
      novalidate
      :aria-busy="feedback.busy.value"
      :inert="feedback.busy.value"
      @submit.prevent="save"
    >
      <p v-if="Object.keys(errors).length" class="form-error" role="alert">
        Check the highlighted fields before continuing. Your entries are still here.
      </p>
      <LeaveFormFields v-if="kind === 'leave'" :values="values" :errors="errors" />

      <EmployeeFormFields v-else-if="kind === 'employee'" :values="values" :errors="errors" />

      <RequestFormFields
        v-else-if="kind === 'request'"
        :values="values"
        :errors="errors"
        :type-locked="api.mode === 'remote' && !!initial"
      />

      <CorrectionFormFields v-else-if="kind === 'correction'" :values="values" :errors="errors" />

      <ScheduleFormFields
        v-else-if="kind === 'master' && (path === 'workSites' || path === 'shifts')"
        :values="values"
        :errors="errors"
        :path="path"
      />

      <MasterFormFields
        v-else-if="kind === 'master'"
        :values="values"
        :errors="errors"
        :path="path"
      />

      <p v-if="feedback.error.value" class="form-error" role="alert">
        {{ feedback.error.value }}
      </p>
      <FormReview
        v-if="kind === 'request' || kind === 'leave' || kind === 'correction'"
        :kind="kind"
        :values="values"
      />
    </form>
    <template #footer>
      <PButton
        label="Cancel"
        severity="secondary"
        outlined
        :disabled="feedback.busy.value"
        @click="close"
      />
      <PButton
        type="submit"
        :form="formId"
        :label="initial ? 'Save changes' : formCopy[kind].submit"
        :loading="feedback.busy.value"
      />
    </template>
  </PDialog>
</template>
