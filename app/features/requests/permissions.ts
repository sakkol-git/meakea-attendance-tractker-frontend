import type { Role } from '../../types/workspace'

/** Presentation eligibility; the provider still checks actual chain membership. */
export function canReviewRequests(mode: string, roles: Role[]) {
  return roles.some((role) =>
    ['MANAGER', 'HR_ADMIN', ...(mode === 'local' ? ['OWNER'] : [])].includes(role),
  )
}
export function canFulfillRequests(mode: string, roles: Role[]) {
  return roles.includes('HR_ADMIN') || (mode === 'local' && roles.includes('OWNER'))
}
