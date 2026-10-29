<script setup lang="ts">
const props = defineProps<{
  values: Record<string, any>
  errors: Record<string, string>
  path: 'shifts' | 'workSites'
}>()
const api = useWorkspace()
const sites = useWorkspaceQuery('shift-form-sites', () => api.list('workSites'))
watch(
  () => props.values.siteId,
  (id) => {
    if (props.path !== 'shifts' || !id) return
    const site = sites.data.value?.items.find((row) => row.id === id)
    if (site?.timezone) props.values.timezone = site.timezone
  },
)
</script>

<template>
  <div class="field">
    <label for="schedule-name">Name</label>
    <PInputText id="schedule-name" v-model="values.name" :aria-invalid="!!errors.name" />
    <small class="field-error">{{ errors.name }}</small>
  </div>
  <template v-if="path === 'workSites'">
    <div class="form-grid">
      <div class="field">
        <label for="site-latitude">Latitude</label>
        <input
          id="site-latitude"
          v-model.number="values.latitude"
          type="number"
          step="0.000001"
          min="-90"
          max="90"
          :aria-invalid="!!errors.latitude"
        />
        <small class="field-error">{{ errors.latitude }}</small>
      </div>
      <div class="field">
        <label for="site-longitude">Longitude</label>
        <input
          id="site-longitude"
          v-model.number="values.longitude"
          type="number"
          step="0.000001"
          min="-180"
          max="180"
          :aria-invalid="!!errors.longitude"
        />
        <small class="field-error">{{ errors.longitude }}</small>
      </div>
    </div>
    <div class="field">
      <label for="site-radius">Approved radius (metres)</label>
      <input
        id="site-radius"
        v-model.number="values.radiusM"
        type="number"
        min="1"
        max="10000"
        :aria-invalid="!!errors.radiusM"
      />
      <small class="field-error">{{ errors.radiusM }}</small>
    </div>
  </template>
  <template v-else>
    <div class="field">
      <label for="shift-site">Work site</label>
      <select id="shift-site" v-model="values.siteId" :aria-invalid="!!errors.siteId">
        <option value="">Choose a work site</option>
        <option v-for="site in sites.data.value?.items || []" :key="site.id" :value="site.id">
          {{ site.name }}
        </option>
      </select>
      <small class="field-error">{{ errors.siteId }}</small>
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="shift-start">Start time</label>
        <input
          id="shift-start"
          v-model="values.startTime"
          type="time"
          :aria-invalid="!!errors.startTime"
        />
        <small class="field-error">{{ errors.startTime }}</small>
      </div>
      <div class="field">
        <label for="shift-end">End time</label>
        <input
          id="shift-end"
          v-model="values.endTime"
          type="time"
          :aria-invalid="!!errors.endTime"
        />
        <small class="field-error">{{ errors.endTime }}</small>
      </div>
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="shift-grace">Grace minutes</label>
        <input
          id="shift-grace"
          v-model.number="values.graceMinutes"
          type="number"
          min="0"
          max="120"
          :aria-invalid="!!errors.graceMinutes"
        />
        <small class="field-error">{{ errors.graceMinutes }}</small>
      </div>
      <div class="field">
        <label for="shift-days">Working days mask</label>
        <input
          id="shift-days"
          v-model.number="values.workingDays"
          type="number"
          min="1"
          max="127"
          :aria-invalid="!!errors.workingDays"
        />
        <small class="field-error">{{ errors.workingDays }}</small>
      </div>
    </div>
  </template>
  <div class="field">
    <label for="schedule-timezone">Timezone</label>
    <PInputText
      id="schedule-timezone"
      v-model="values.timezone"
      placeholder="Asia/Phnom_Penh"
      :aria-invalid="!!errors.timezone"
    />
    <small class="field-error">{{ errors.timezone }}</small>
  </div>
</template>
