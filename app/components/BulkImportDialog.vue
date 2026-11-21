<script setup lang="ts">
import type { Resource } from '~/types/workspace'
import { generateCsv, getSampleCsvTemplate, parseCsv } from '~/utils/csv'

const props = defineProps<{
  visible: boolean
  resource: Resource
  title?: string
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
  imported: [count: number]
}>()

const api = useWorkspace()
const feedback = useFeedback()

const file = ref<File | null>(null)
const fileName = ref('')
const parsedHeaders = ref<string[]>([])
const parsedRows = ref<Record<string, string>[]>([])
const rowErrors = ref<string[]>([])
const isImporting = ref(false)
const progress = ref(0)
const importResult = ref<{ success: number; failed: number } | null>(null)
const globalError = ref<string | null>(null)

const validRows = computed(() => parsedRows.value.filter((_, idx) => !rowErrors.value[idx]))
const invalidCount = computed(() => rowErrors.value.filter(Boolean).length)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      reset()
    }
  },
)

function reset() {
  file.value = null
  fileName.value = ''
  parsedHeaders.value = []
  parsedRows.value = []
  rowErrors.value = []
  isImporting.value = false
  progress.value = 0
  importResult.value = null
  globalError.value = null
}

function close() {
  emit('update:visible', false)
}

function downloadTemplate() {
  const template = getSampleCsvTemplate(props.resource)
  const csvContent = generateCsv(template.headers, [template.sampleRow])
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `hrflow-${props.resource}-template.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function validateRow(row: Record<string, string>): string {
  if (props.resource === 'employees') {
    if (!row.name || !row.name.trim()) return 'Name is required'
    if (!row.email || !row.email.includes('@')) return 'Valid email is required'
  } else if (props.resource === 'departments') {
    if (!row.name || !row.name.trim()) return 'Department name is required'
  } else if (props.resource === 'positions') {
    if (!row.title || !row.title.trim()) return 'Position title is required'
  } else if (props.resource === 'shifts') {
    if (!row.name || !row.name.trim()) return 'Shift name is required'
    if (!row.start || !row.end) return 'Start and end times are required'
  } else if (props.resource === 'workSites') {
    if (!row.name || !row.name.trim()) return 'Work site name is required'
  } else {
    const firstVal = Object.values(row)[0]
    if (!firstVal || !firstVal.trim()) return 'Record name is required'
  }
  return ''
}

function loadFile(f: File) {
  if (isImporting.value) return
  parsedHeaders.value = []
  parsedRows.value = []
  rowErrors.value = []
  file.value = f
  fileName.value = f.name
  globalError.value = null
  importResult.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    if (file.value !== f) return
    try {
      const text = String(e.target?.result || '')
      const { headers, rows } = parseCsv(text)
      if (rows.length === 0) {
        globalError.value = 'The uploaded CSV file is empty or missing data rows.'
        return
      }
      parsedHeaders.value = headers
      parsedRows.value = rows
      rowErrors.value = rows.map(validateRow)
    } catch {
      globalError.value = 'Failed to parse CSV file. Please verify file encoding.'
    }
  }
  reader.onerror = () => {
    if (file.value !== f) return
    globalError.value = 'Error reading the file.'
  }
  reader.readAsText(f)
}

async function startImport() {
  if (isImporting.value || validRows.value.length === 0) return
  isImporting.value = true
  progress.value = 0
  let successCount = 0
  let failCount = 0

  const rowsToImport = validRows.value

  for (let i = 0; i < rowsToImport.length; i++) {
    const row = rowsToImport[i]
    try {
      const payload: Record<string, string | number> = { ...row }
      if (payload.latitude) payload.latitude = Number(payload.latitude)
      if (payload.longitude) payload.longitude = Number(payload.longitude)
      if (payload.radiusMeters) payload.radiusMeters = Number(payload.radiusMeters)

      await api.create(props.resource, payload as any)
      successCount++
    } catch {
      failCount++
    }
    progress.value = Math.round(((i + 1) / rowsToImport.length) * 100)
  }

  isImporting.value = false
  importResult.value = { success: successCount, failed: failCount }
  if (successCount > 0) {
    emit('imported', successCount)
  }
}
</script>

<template>
  <PDialog
    :visible="visible"
    modal
    :header="title || `Bulk import ${resource}`"
    class="dialog-xl"
    :breakpoints="{ '640px': '95vw' }"
    :dismissable-mask="!isImporting"
    :closable="!isImporting"
    :close-on-escape="!isImporting"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="bulk-import-container">
      <div class="template-bar">
        <div>
          <p class="template-lead">Upload a CSV file to import multiple {{ resource }} at once.</p>
          <small class="text-secondary">Save time by downloading our pre-formatted template.</small>
        </div>
        <PButton
          label="Download template"
          icon="pi pi-download"
          size="small"
          outlined
          @click="downloadTemplate"
        />
      </div>

      <p v-if="globalError" role="alert" class="form-error">
        {{ globalError }}
      </p>

      <!-- Dropzone -->
      <CsvDropzone
        v-if="!importResult"
        :inert="isImporting"
        :aria-disabled="isImporting"
        :file-name="fileName"
        :row-count="parsedRows.length"
        @file-selected="loadFile"
        @file-rejected="(msg) => (globalError = msg)"
      />

      <CsvImportPreview
        v-if="!importResult"
        :rows="parsedRows"
        :headers="parsedHeaders"
        :row-errors="rowErrors"
        :valid-count="validRows.length"
        :invalid-count="invalidCount"
      />

      <!-- Progress during import -->
      <div v-if="isImporting" class="progress-section">
        <p>Importing {{ validRows.length }} records... ({{ progress }}%)</p>
        <div
          class="progress-bar-track"
          role="progressbar"
          aria-label="Import progress"
          :aria-valuenow="progress"
          :aria-valuemin="0"
          :aria-valuemax="100"
        >
          <div class="progress-bar-fill" :style="{ width: `${progress}%` }" />
        </div>
      </div>

      <!-- Import result -->
      <div v-if="importResult" class="result-section" role="status">
        <span class="result-icon success"><AppIcon name="check-circle" /></span>
        <h3>{{ importResult.failed ? 'Import finished with issues' : 'Import complete' }}</h3>
        <p v-if="invalidCount">
          {{ invalidCount }} rows were skipped because they have validation issues.
        </p>
        <p>
          Successfully created <strong>{{ importResult.success }}</strong> {{ resource }}.
          <span v-if="importResult.failed > 0">
            ({{ importResult.failed }} records failed due to validation or server errors.)
          </span>
        </p>
      </div>
    </div>

    <template #footer>
      <div class="dialog-actions">
        <PButton
          v-if="!importResult"
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isImporting"
          @click="close"
        />
        <PButton
          v-if="!importResult"
          :label="isImporting ? 'Importing...' : `Import ${validRows.length} ${resource}`"
          icon="pi pi-check"
          :loading="isImporting"
          :disabled="validRows.length === 0 || isImporting"
          @click="startImport"
        />
        <PButton v-if="importResult" label="Done" icon="pi pi-check" @click="close" />
      </div>
    </template>
  </PDialog>
</template>
