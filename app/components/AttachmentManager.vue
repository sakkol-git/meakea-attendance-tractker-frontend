<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import type { AttachmentItem } from '~/features/requests/data/attachment-records'
import { saveFile } from '~/utils/download'

const props = withDefaults(
  defineProps<{
    scope: 'leave' | 'request'
    recordId: string
    readonly?: boolean
  }>(),
  {
    readonly: false,
  },
)

const app = useNuxtApp()
const toast = useToast()
const fileInput = ref<HTMLInputElement>()
const dragOver = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const error = ref('')

const api = useWorkspace()
const attachments = ref<AttachmentItem[]>([])
const loading = ref(false)
async function load() {
  attachments.value = []
  if (api.mode === 'local') return
  loading.value = true
  try {
    attachments.value = await api.attachmentItems(props.scope, props.recordId)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Could not load attachments.'
  } finally {
    loading.value = false
  }
}
watch(() => [props.scope, props.recordId], load, { immediate: true })

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function getIcon(contentType: string): string {
  if (contentType.includes('pdf')) return 'file-pdf'
  if (contentType.startsWith('image/')) return 'image'
  return 'file'
}

async function handleFile(file: File) {
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'File size exceeds 10MB limit.'
    toast.add({
      severity: 'error',
      summary: 'File too large',
      detail: 'Maximum file size is 10MB.',
    })
    return
  }

  error.value = ''
  uploading.value = true
  uploadProgress.value = 25

  try {
    uploadProgress.value = 60
    const result = await app.$business.upload(props.scope, props.recordId, file)
    uploadProgress.value = 100

    if (api.mode === 'remote') await load()
    else
      attachments.value.push({
        id: result.id,
        name: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
      })

    toast.add({
      severity: 'success',
      summary: 'Attachment uploaded',
      detail: file.name,
      life: 3000,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed.'
    toast.add({
      severity: 'error',
      summary: 'Attachment upload failed',
      detail: error.value,
      life: 5000,
    })
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

function onFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    if (!uploading.value) handleFile(target.files[0])
    target.value = ''
  }
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  if (props.readonly || uploading.value) return
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    handleFile(e.dataTransfer.files[0])
  }
}

async function downloadAttachment(item: AttachmentItem) {
  error.value = ''
  try {
    if (api.mode === 'remote') {
      const bytes = await api.attachmentBytes(props.scope, props.recordId, item.id)
      saveFile(new Uint8Array(bytes), item.name, item.contentType)
    } else await app.$business.download('BF-026', item.id)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Download failed.'
    toast.add({
      severity: 'error',
      summary: 'Attachment download failed',
      detail: error.value,
      life: 5000,
    })
  }
}
</script>

<template>
  <div class="attachment-manager">
    <div class="attachment-header">
      <h3 class="attachment-title">Attachments ({{ attachments.length }})</h3>
      <span v-if="uploading" class="attachment-uploading-status">
        Uploading… {{ uploadProgress }}%
      </span>
    </div>

    <p v-if="loading" role="status">Loading attachments…</p>
    <!-- Drop Zone -->
    <div
      v-if="!readonly && (api.mode === 'local' || scope === 'request')"
      class="attachment-drop-target"
      :class="{ 'is-dragover': dragOver }"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        class="hidden-file-input"
        accept=".pdf,.png,.jpg,.jpeg"
        :disabled="uploading"
        @change="onFileSelect"
      />
      <AppIcon name="paperclip" class="attachment-drop-icon" />
      <p class="attachment-drop-prompt">Click to browse or drag and drop files here</p>
      <small class="attachment-drop-hint">PDF, PNG or JPEG up to 10MB</small>
    </div>

    <p v-if="error" role="alert" class="form-error">
      {{ error }}
    </p>

    <!-- Attachments List -->
    <div v-if="attachments.length" class="attachment-list">
      <div v-for="item in attachments" :key="item.id" class="attachment-item">
        <div class="attachment-item-lead">
          <AppIcon :name="getIcon(item.contentType)" class="attachment-item-icon" />
          <div>
            <strong>{{ item.name }}</strong>
            <small>{{ formatSize(item.size) }}</small>
          </div>
        </div>
        <PButton
          icon="pi pi-download"
          label="Download"
          size="small"
          text
          @click="downloadAttachment(item)"
        />
      </div>
    </div>
  </div>
</template>
