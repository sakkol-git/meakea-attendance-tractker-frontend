import { expect, it } from 'vitest'
import { canReviewRequests, canFulfillRequests } from '../../app/features/requests/permissions'
it('owner organization access does not imply remote HR request approval or fulfillment', () => {
  expect(canReviewRequests('remote', ['OWNER'])).toBe(false)
  expect(canFulfillRequests('remote', ['OWNER'])).toBe(false)
  expect(canReviewRequests('remote', ['MANAGER'])).toBe(true)
  expect(canFulfillRequests('remote', ['MANAGER'])).toBe(false)
  expect(canReviewRequests('remote', ['OWNER', 'HR_ADMIN'])).toBe(true)
  expect(canFulfillRequests('remote', ['OWNER', 'HR_ADMIN'])).toBe(true)
  expect(canReviewRequests('local', ['OWNER'])).toBe(true)
})
