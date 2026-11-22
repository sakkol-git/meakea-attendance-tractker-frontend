<script setup lang="ts">
import { failureMessage } from '~/utils/failure'
import WorkingDaysPicker from '~/components/forms/WorkingDaysPicker.vue'
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
    <PInputText
      id="schedule-name"
      v-model="values.name"
      :aria-invalid="!!errors.name"
      aria-describedby="schedule-error-name"
    />
    <small id="schedule-error-name" class="field-error">{{ errors.name }}</small>
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
          aria-describedby="latitude-help schedule-error-latitude"
        />
        <small id="latitude-help">Decimal degrees, from −90 to 90.</small>
        <small id="schedule-error-latitude" class="field-error">{{ errors.latitude }}</small>
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
          aria-describedby="longitude-help schedule-error-longitude"
        />
        <small id="longitude-help">Decimal degrees, from −180 to 180.</small>
        <small id="schedule-error-longitude" class="field-error">{{ errors.longitude }}</small>
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
        aria-describedby="radius-help schedule-error-radiusM"
      />
      <small id="radius-help">Distance from the site coordinates, from 1 to 10,000 metres.</small>
      <small id="schedule-error-radiusM" class="field-error">{{ errors.radiusM }}</small>
    </div>
  </template>
  <template v-else>
    <div class="field">
      <label for="shift-site">Work site</label>
      <select
        id="shift-site"
        v-model="values.siteId"
        :aria-invalid="!!errors.siteId"
        aria-describedby="schedule-error-siteId"
      >
        <option value="">Choose a work site</option>
        <option v-for="site in sites.data.value?.items || []" :key="site.id" :value="site.id">
          {{ site.name }}
        </option>
      </select>
      <div v-if="sites.error.value" role="alert" class="field-error">
        {{ failureMessage(sites.error.value) }}
        <PButton
          label="Retry work sites"
          text
          :loading="sites.isFetching.value"
          @click="sites.refetch()"
        />
      </div>
      <small v-if="sites.isSuccess.value && !sites.data.value?.items.length"
        >No work sites are available. Add a work site before assigning a shift.</small
      >
      <small id="schedule-error-siteId" class="field-error">{{ errors.siteId }}</small>
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="shift-start">Start time</label>
        <input
          id="shift-start"
          v-model="values.startTime"
          type="time"
          :aria-invalid="!!errors.startTime"
          aria-describedby="schedule-error-startTime"
        />
        <small id="schedule-error-startTime" class="field-error">{{ errors.startTime }}</small>
      </div>
      <div class="field">
        <label for="shift-end">End time</label>
        <input
          id="shift-end"
          v-model="values.endTime"
          type="time"
          :aria-invalid="!!errors.endTime"
          aria-describedby="schedule-error-endTime"
        />
        <small id="schedule-error-endTime" class="field-error">{{ errors.endTime }}</small>
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
          aria-describedby="grace-help schedule-error-graceMinutes"
        />
        <small id="grace-help">Enter 0–120 minutes.</small>
        <small id="schedule-error-graceMinutes" class="field-error">{{
          errors.graceMinutes
        }}</small>
      </div>
      <WorkingDaysPicker v-model="values.workingDays" :error="errors.workingDays" />
    </div>
  </template>
  <div class="field">
    <label for="schedule-timezone">Timezone</label>
    <PInputText
      id="schedule-timezone"
      v-model="values.timezone"
      placeholder="Asia/Phnom_Penh"
      autocapitalize="none"
      :spellcheck="false"
      :aria-invalid="!!errors.timezone"
      aria-describedby="timezone-help schedule-error-timezone"
    />
    <small id="timezone-help">Use a time-zone name such as Asia/Phnom_Penh.</small>
    <small id="schedule-error-timezone" class="field-error">{{ errors.timezone }}</small>
  </div>
</template>
