import { expect, it } from 'vitest'
import { notificationRoute } from '../../app/utils/notification-route'
it('uses domain-specific private record routes and keeps attendance distinct from corrections', () => {
  expect(notificationRoute({ kind: 'request', recordId: 'request-a' })).toBe('/requests/request-a')
  expect(notificationRoute({ kind: 'leave', recordId: 'leave-a' })).toBe('/leave/leave-a')
  expect(notificationRoute({ kind: 'correction', recordId: 'correction-a' })).toBe(
    '/attendance?correction=correction-a',
  )
  expect(notificationRoute({ kind: 'attendance', recordId: 'session-a' })).toBe('/attendance')
})
it('accepts unknown legacy notices without unsafe or invented navigation', () => {
  for (const notice of [
    { to: null },
    { to: '' },
    { to: 'https://evil.test' },
    { to: '//evil.test' },
    { kind: 'request', recordId: '../other' },
    { kind: 'unknown', recordId: 'a' },
  ])
    expect(notificationRoute(notice)).toBeUndefined()
  expect(notificationRoute({ to: '/leave/leave-a' })).toBe('/leave/leave-a')
})
