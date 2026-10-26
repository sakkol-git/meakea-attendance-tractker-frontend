import type { DataSource } from '../data/source'
import type { Resource } from '../types/workspace'

export function resourcePath(mode: DataSource['mode'], resource: Resource) {
  const paths: Record<Resource, string> = {
    leaves: '/leave/requests',
    myLeaves: '/leave/requests/me',
    pendingLeaves: '/leave/requests/pending',
    requests: '/requests',
    myRequests: '/requests/me',
    pendingRequests: mode === 'local' ? '/requests/pending' : '/requests/inbox',
    corrections: '/attendance/corrections',
    employees: '/employees',
    departments: '/departments',
    positions: '/positions',
    shifts: '/shifts',
    holidays: '/holidays',
    workSites: '/work-sites',
    materials: '/materials',
  }
  return paths[resource]
}
