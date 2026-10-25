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
      withinBoundary: true, // If no sites configured, policy allows check-in with GPS logged
      distanceMeters: 0,
      allowedRadiusMeters: defaultRadiusMeters,
      accuracyMeters: accuracy,
      status: 'NO_SITES_CONFIGURED',
      message: 'No physical work-site perimeter configured. Coordinates will be recorded.',
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
