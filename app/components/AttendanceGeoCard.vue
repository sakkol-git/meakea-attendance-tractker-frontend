<script setup lang="ts">
import {
  evaluateGeofence,
  configuredWorkSites,
  type GeolocationCoordinates,
  type GeofenceEvaluation,
} from '~/utils/geofence'

const emit = defineEmits<{
  'update:location': [GeolocationCoordinates | undefined]
}>()

const api = useWorkspace()
const workSitesQuery = useWorkspaceQuery('attendance-worksites', () => api.list('workSites'))

const loading = ref(false)
const error = ref('')
const coords = ref<GeolocationCoordinates>()
const evaluation = ref<GeofenceEvaluation>()

const sites = computed(() => configuredWorkSites(workSitesQuery.data.value?.items || []))
const denied = ref(false)
watch([coords, sites], () => {
  evaluation.value = coords.value ? evaluateGeofence(coords.value, sites.value) : undefined
})

function requestLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    error.value = 'Geolocation is not supported by your browser.'
    return
  }

  loading.value = true
  error.value = ''
  denied.value = false

  navigator.geolocation.getCurrentPosition(
    (position) => {
      loading.value = false
      const userCoords: GeolocationCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      }
      coords.value = userCoords
      evaluation.value = evaluateGeofence(userCoords, sites.value)
      emit('update:location', userCoords)
    },
    (err) => {
      loading.value = false
      coords.value = undefined
      evaluation.value = undefined
      if (err.code === 1) {
        denied.value = true
        error.value =
          'Location access is off. Enable location for this site in your browser settings, then try again.'
      } else if (err.code === 2) {
        error.value = 'Unable to determine your current position.'
      } else {
        error.value = 'Location request timed out. Please try again.'
      }
      emit('update:location', undefined)
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    },
  )
}
</script>

<template>
  <div class="panel attendance-geo-card">
    <div class="geo-card-main">
      <div class="geo-card-lead">
        <span class="record-icon geo-icon" :class="evaluation?.withinBoundary ? 'blue' : 'violet'">
          <AppIcon name="map-marker" />
        </span>
        <div>
          <strong class="geo-title">Attendance location</strong>
          <div role="status" aria-live="polite">
            <small v-if="loading" class="geo-status-loading">Finding your location…</small>
            <small v-else-if="evaluation" class="geo-status-text">{{ evaluation.message }}</small>
            <small v-else-if="error" class="geo-status-error">{{ error }}</small>
            <small v-else class="geo-status-muted"
              >Share a location sample when you are ready. Your company’s attendance rules still
              apply.</small
            >
          </div>
        </div>
      </div>

      <div class="geo-card-actions">
        <span v-if="evaluation?.withinBoundary" class="status-badge active geo-badge">
          Within site boundary · browser estimate
        </span>
        <span
          v-else-if="evaluation?.status === 'OUTSIDE_BOUNDARY'"
          class="status-badge geo-badge-warning"
        >
          Outside work site
        </span>
        <PButton
          :label="coords ? 'Refresh location' : denied ? 'Try location again' : 'Share location'"
          icon="pi pi-map-marker"
          size="small"
          text
          :loading="loading"
          @click="requestLocation"
        />
      </div>
    </div>

    <p v-if="coords" class="small-note">
      Location captured. You can now use the attendance action. Your company’s rules are checked
      when you submit.
    </p>
    <div v-if="workSitesQuery.error.value" class="small-note" role="status">
      Work site details are unavailable. Your location alone does not confirm site eligibility.
      <PButton label="Retry work sites" text size="small" @click="workSitesQuery.refetch()" />
    </div>

    <div v-if="coords" class="geo-coords-bar">
      <span
        >Latitude: <strong>{{ coords.latitude.toFixed(4) }}°</strong></span
      >
      <span
        >Longitude: <strong>{{ coords.longitude.toFixed(4) }}°</strong></span
      >
      <span
        >Accuracy:
        <strong>{{
          coords.accuracyMeters == null ? 'Unknown' : `±${Math.round(coords.accuracyMeters)} m`
        }}</strong></span
      >
    </div>
  </div>
</template>
