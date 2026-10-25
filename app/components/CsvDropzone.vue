<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    fileName?: string
    rowCount?: number
  }>(),
  {
    fileName: '',
    rowCount: 0,
  },
)

const emit = defineEmits<{
  fileSelected: [file: File]
  fileRejected: [reason: string]
}>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const dropped = e.dataTransfer?.files?.[0]
  if (!dropped) return
  if (
    dropped.name.endsWith('.csv') ||
    dropped.type.includes('csv') ||
    dropped.type.includes('text')
  ) {
    emit('fileSelected', dropped)
  } else {
    emit('fileRejected', 'Please upload a valid .csv file.')
  }
}

function onFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const selected = target.files?.[0]
  if (selected) {
    emit('fileSelected', selected)
  }
}

function triggerFileSelect() {
  fileInput.value?.click()
}
</script>

<template>
  <div
    class="csv-dropzone"
    :class="{ dragging: isDragging, 'has-file': Boolean(fileName) }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="triggerFileSelect"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".csv,text/csv"
      class="hidden-file-input"
      @change="onFileSelect"
    />
    <div class="dropzone-content">
      <span class="dropzone-icon">
        <AppIcon name="upload" />
      </span>
      <div v-if="fileName">
        <strong>{{ fileName }}</strong>
        <p>{{ rowCount }} rows found (click to change file)</p>
      </div>
      <div v-else>
        <strong>Choose a CSV file or drag & drop it here</strong>
        <p>Standard comma-separated format up to 5MB</p>
      </div>
    </div>
  </div>
</template>
