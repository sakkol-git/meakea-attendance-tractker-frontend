<script setup lang="ts">
import { z } from 'zod'
import { useConfirm } from 'primevue/useconfirm'
import { leaveForm, requestForm, correctionForm, employeeForm } from '~/schemas/forms'

import type { EntityRow, Resource } from '~/types/workspace'
import type { RecordData } from '~/data/source'
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
const values = reactive<Record<string, string | number>>({})
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
      startDate: '',
      endDate: '',
      reason: '',
      title: '',
      quantity: 1,
      date: '',
      name: '',
      email: '',
      department: '',
      position: '',
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
    for (const issue of parsed.error.issues) errors.value[String(issue.path[0])] = issue.message
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
  const body = JSON.parse(JSON.stringify(parsed.data)) as RecordData
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
    :style="{ width: '38rem' }"
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
      <template v-if="kind === 'leave'"
        ><div class="field">
          <label for="form-type">Leave type</label
          ><PSelect
            input-id="form-type"
            v-model="values.type"
            :options="['Annual leave', 'Medical leave', 'Personal leave']"
            aria-label="Leave type"
            placeholder="Select a leave type"
            :invalid="!!errors.type"
            :aria-invalid="!!errors.type"
            aria-describedby="error-type"
          /><small id="error-type" class="field-error">{{ errors.type }}</small>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="form-start">From</label
            ><input
              id="form-start"
              v-model="values.startDate"
              type="date"
              :aria-invalid="!!errors.startDate"
              aria-describedby="error-start"
            /><small id="error-start" class="field-error">{{ errors.startDate }}</small>
          </div>
          <div class="field">
            <label for="form-end">To</label
            ><input
              id="form-end"
              v-model="values.endDate"
              type="date"
              :aria-invalid="!!errors.endDate"
              aria-describedby="error-end"
            /><small id="error-end" class="field-error">{{ errors.endDate }}</small>
          </div>
        </div></template
      >
      <template v-if="kind === 'request'"
        ><div class="field">
          <label for="form-title">What do you need?</label
          ><PInputText
            id="form-title"
            v-model="values.title"
            placeholder="For example, a monitor for my desk"
            :aria-invalid="!!errors.title"
            aria-describedby="error-title"
          /><small id="error-title" class="field-error">{{ errors.title }}</small>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="form-type">Request type</label
            ><PSelect
              input-id="form-type"
              v-model="values.type"
              :options="['Equipment', 'Remote work', 'General']"
              aria-label="Request type"
              placeholder="Select a type"
              :aria-invalid="!!errors.type"
              aria-describedby="error-type"
            /><small id="error-type" class="field-error">{{ errors.type }}</small>
          </div>
          <div class="field">
            <label for="form-quantity">Quantity</label
            ><input
              id="form-quantity"
              v-model.number="values.quantity"
              type="number"
              min="1"
              max="100"
              :aria-invalid="!!errors.quantity"
              aria-describedby="error-quantity"
            /><small id="error-quantity" class="field-error">{{ errors.quantity }}</small>
          </div>
        </div></template
      >
      <div v-if="kind === 'correction'" class="field">
        <label for="form-date">Affected date</label
        ><input
          id="form-date"
          v-model="values.date"
          type="date"
          :aria-invalid="!!errors.date"
          aria-describedby="error-date"
        /><small id="error-date" class="field-error">{{ errors.date }}</small>
      </div>
      <template v-if="kind === 'employee' || kind === 'master'"
        ><div class="field">
          <label for="form-name">{{ kind === 'employee' ? 'Full name' : 'Name' }}</label
          ><PInputText
            id="form-name"
            v-model="values.name"
            :aria-invalid="!!errors.name"
            aria-describedby="error-name"
          /><small id="error-name" class="field-error">{{ errors.name }}</small>
        </div></template
      >
      <template v-if="kind === 'employee'"
        ><div class="field">
          <label for="form-email">Work email</label
          ><PInputText
            id="form-email"
            v-model="values.email"
            type="email"
            :aria-invalid="!!errors.email"
            aria-describedby="error-email"
          /><small id="error-email" class="field-error">{{ errors.email }}</small>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="form-department">Department</label
            ><PInputText
              id="form-department"
              v-model="values.department"
              :aria-invalid="!!errors.department"
              aria-describedby="error-department"
            /><small id="error-department" class="field-error">{{ errors.department }}</small>
          </div>
          <div class="field">
            <label for="form-position">Position</label
            ><PInputText
              id="form-position"
              v-model="values.position"
              :aria-invalid="!!errors.position"
              aria-describedby="error-position"
            /><small id="error-position" class="field-error">{{ errors.position }}</small>
          </div>
        </div></template
      >
      <template v-if="kind === 'master'">
        <div v-if="path === 'materials'" class="field">
          <label for="form-stock">Available quantity</label
          ><input
            id="form-stock"
            v-model.number="values.quantity"
            type="number"
            min="0"
            step="1"
            :aria-invalid="!!errors.quantity"
            aria-describedby="error-stock"
          /><small id="error-stock" class="field-error">{{ errors.quantity }}</small>
        </div>
        <div v-if="path === 'holidays'" class="field">
          <label for="form-date">Holiday date</label
          ><input
            id="form-date"
            v-model="values.date"
            type="date"
            :aria-invalid="!!errors.date"
            aria-describedby="error-date"
          /><small id="error-date" class="field-error">{{ errors.date }}</small>
        </div>
        <div v-if="path === 'shifts'" class="form-grid">
          <div class="field">
            <label for="form-shift-start">Start time</label
            ><input id="form-shift-start" v-model="values.start" type="time" />
          </div>
          <div class="field">
            <label for="form-shift-end">End time</label
            ><input id="form-shift-end" v-model="values.end" type="time" />
          </div>
        </div>
        <div class="field">
          <label for="form-description">Description <span>(optional)</span></label
          ><PTextarea
            id="form-description"
            v-model="values.description"
            rows="3"
            auto-resize
          /></div
      ></template>
      <div v-if="['leave', 'request', 'correction'].includes(kind)" class="field">
        <label for="form-reason">{{
          kind === 'correction' ? 'What happened?' : 'A little context'
        }}</label
        ><PTextarea
          id="form-reason"
          v-model="values.reason"
          rows="4"
          auto-resize
          placeholder="Add the details your approver needs…"
          :aria-invalid="!!errors.reason"
          aria-describedby="error-reason"
        /><small id="error-reason" class="field-error">{{ errors.reason }}</small>
      </div>
      <p v-if="feedback.error.value" class="form-error" role="alert">{{ feedback.error.value }}</p>
      <footer class="dialog-actions">
        <PButton
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="feedback.busy.value"
          @click="close"
        /><PButton
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
