<script setup lang="ts">
import {
  evaluateGeofence,
  type GeolocationCoordinates,
  type GeofenceEvaluation,
  type WorkSiteLocation,
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

const sites = computed<WorkSiteLocation[]>(() => {
  return (workSitesQuery.data.value?.items || []).map((item) => ({
    id: item.id,
    name: item.name || 'Office Work Site',
    latitude: typeof item.latitude === 'number' ? item.latitude : 11.5732,
    longitude: typeof item.longitude === 'number' ? item.longitude : 104.9189,
    radiusMeters: typeof item.radiusMeters === 'number' ? item.radiusMeters : 200,
  }))
})

function requestLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    error.value = 'Geolocation is not supported by your browser.'
    return
  }

  loading.value = true
  error.value = ''

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
      if (err.code === 1) {
        error.value = 'Location permission denied. You can still clock with unverified GPS.'
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

onMounted(() => {
  requestLocation()
})
</script>

<template>
  <div class="panel attendance-geo-card">
    <div class="geo-card-main">
      <div class="geo-card-lead">
        <span class="record-icon geo-icon" :class="evaluation?.withinBoundary ? 'blue' : 'violet'">
          <AppIcon name="map-marker" />
        </span>
        <div>
          <strong class="geo-title">Workspace Geolocation</strong>
          <small v-if="loading" class="geo-status-loading">Acquiring GPS coordinates…</small>
          <small v-else-if="evaluation" class="geo-status-text">{{ evaluation.message }}</small>
          <small v-else-if="error" class="geo-status-error">{{ error }}</small>
          <small v-else class="geo-status-muted">Checking work-site perimeter</small>
        </div>
      </div>

      <div class="geo-card-actions">
        <span v-if="evaluation?.withinBoundary" class="status-badge active geo-badge">
          Verified in boundary
        </span>
        <span
          v-else-if="evaluation && !evaluation.withinBoundary"
          class="status-badge geo-badge-warning"
        >
          Outside perimeter
        </span>
        <PButton
          icon="pi pi-refresh"
          size="small"
          text
          rounded
          aria-label="Refresh GPS location"
          :loading="loading"
          @click="requestLocation"
        />
      </div>
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
        <strong>±{{ coords.accuracyMeters ? Math.round(coords.accuracyMeters) : 0 }}m</strong></span
      >
    </div>
  </div>
</template>
