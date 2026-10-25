import { describe, expect, it } from 'vitest'
import { haversineDistanceMeters, evaluateGeofence } from '../../app/utils/geofence'

describe('haversineDistanceMeters', () => {
  it('calculates distance between two Phnom Penh points accurately', () => {
    // Vattanac Capital Tower (11.5732, 104.9189) to Central Market (11.5694, 104.9216) ~ 510-530m
    const distance = haversineDistanceMeters(11.5732, 104.9189, 11.5694, 104.9216)
    expect(distance).toBeGreaterThan(480)
    expect(distance).toBeLessThan(550)
  })

  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceMeters(11.5732, 104.9189, 11.5732, 104.9189)).toBe(0)
  })
})

describe('evaluateGeofence', () => {
  const sites = [
    {
      id: 'site-hq',
      name: 'Phnom Penh HQ',
      latitude: 11.5732,
      longitude: 104.9189,
      radiusMeters: 150,
    },
    {
      id: 'site-branch',
      name: 'Siem Reap Branch',
      latitude: 13.3633,
      longitude: 103.8564,
      radiusMeters: 200,
    },
  ]

  it('confirms presence when coordinates are within the office radius', () => {
    // Point 40 meters away from HQ
    const result = evaluateGeofence(
      { latitude: 11.5735, longitude: 104.9191, accuracyMeters: 10 },
      sites,
    )
    expect(result.withinBoundary).toBe(true)
    expect(result.status).toBe('WITHIN_BOUNDARY')
    expect(result.nearestSite?.id).toBe('site-hq')
    expect(result.distanceMeters).toBeLessThan(150)
  })

  it('detects when user is outside the permitted boundary', () => {
    // Central Market (~510m away from HQ)
    const result = evaluateGeofence(
      { latitude: 11.5694, longitude: 104.9216, accuracyMeters: 15 },
      sites,
    )
    expect(result.withinBoundary).toBe(false)
    expect(result.status).toBe('OUTSIDE_BOUNDARY')
    expect(result.distanceMeters).toBeGreaterThan(150)
  })

  it('flags poor GPS accuracy when precision is inadequate', () => {
    const result = evaluateGeofence(
      { latitude: 11.5732, longitude: 104.9189, accuracyMeters: 250 },
      sites,
    )
    expect(result.withinBoundary).toBe(false)
    expect(result.status).toBe('ACCURACY_POOR')
  })
})
