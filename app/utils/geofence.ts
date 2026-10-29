export interface WorkSiteLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusMeters?: number
}

export interface GeolocationCoordinates {
  latitude: number
  longitude: number
  accuracyMeters?: number
}

export function configuredWorkSites(rows: Record<string, unknown>[]): WorkSiteLocation[] {
  return rows.flatMap((row) => {
    const latitude = row.latitude
    const longitude = row.longitude
    const radius = row.radiusMeters ?? row.radiusM
    if (
      typeof latitude !== 'number' ||
      !Number.isFinite(latitude) ||
      Math.abs(latitude) > 90 ||
      typeof longitude !== 'number' ||
      !Number.isFinite(longitude) ||
      Math.abs(longitude) > 180 ||
      typeof radius !== 'number' ||
      !Number.isFinite(radius) ||
      radius <= 0
    )
      return []
    return [
      {
        id: String(row.id),
        name: String(row.name || 'Work site'),
        latitude,
        longitude,
        radiusMeters: radius,
      },
    ]
  })
}

export interface GeofenceEvaluation {
  withinBoundary: boolean
  nearestSite?: WorkSiteLocation
  distanceMeters: number
  allowedRadiusMeters: number
  accuracyMeters: number
  status: 'WITHIN_BOUNDARY' | 'OUTSIDE_BOUNDARY' | 'ACCURACY_POOR' | 'NO_SITES_CONFIGURED'
  message: string
}

const EARTH_RADIUS_METERS = 6371000

/**
 * Calculates distance between two GPS coordinates using the Haversine formula.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(EARTH_RADIUS_METERS * c)
}

/**
 * Evaluates whether a user GPS coordinate falls within any authorized work-site perimeter.
 */
export function evaluateGeofence(
  coords: GeolocationCoordinates,
  workSites: WorkSiteLocation[] = [],
  defaultRadiusMeters = 200,
): GeofenceEvaluation {
  const accuracy = Math.round(coords.accuracyMeters ?? 15)

  if (!workSites.length) {
    return {
      withinBoundary: false,
      distanceMeters: 0,
      allowedRadiusMeters: defaultRadiusMeters,
      accuracyMeters: accuracy,
      status: 'NO_SITES_CONFIGURED',
      message: 'No configured work-site boundary is available to compare this location.',
    }
  }

  // Find closest work-site
  let nearestSite: WorkSiteLocation = workSites[0]!
  let shortestDistance = haversineDistanceMeters(
    coords.latitude,
    coords.longitude,
    nearestSite.latitude,
    nearestSite.longitude,
  )

  for (let i = 1; i < workSites.length; i++) {
    const site = workSites[i]!
    const dist = haversineDistanceMeters(
      coords.latitude,
      coords.longitude,
      site.latitude,
      site.longitude,
    )
    if (dist < shortestDistance) {
      shortestDistance = dist
      nearestSite = site
    }
  }

  const allowedRadius = nearestSite.radiusMeters ?? defaultRadiusMeters

  if (accuracy > 150) {
    return {
      withinBoundary: false,
      nearestSite,
      distanceMeters: shortestDistance,
      allowedRadiusMeters: allowedRadius,
      accuracyMeters: accuracy,
      status: 'ACCURACY_POOR',
      message: `GPS accuracy is low (±${accuracy}m). Move closer to open sky for a reliable lock.`,
    }
  }

  if (shortestDistance <= allowedRadius) {
    return {
      withinBoundary: true,
      nearestSite,
      distanceMeters: shortestDistance,
      allowedRadiusMeters: allowedRadius,
      accuracyMeters: accuracy,
      status: 'WITHIN_BOUNDARY',
      message: `Within ${nearestSite.name} boundary (${shortestDistance}m from office center).`,
    }
  }

  return {
    withinBoundary: false,
    nearestSite,
    distanceMeters: shortestDistance,
    allowedRadiusMeters: allowedRadius,
    accuracyMeters: accuracy,
    status: 'OUTSIDE_BOUNDARY',
    message: `Outside designated perimeter for ${nearestSite.name} (${shortestDistance}m away, limit is ${allowedRadius}m).`,
  }
}
