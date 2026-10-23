import { expect, test } from '@playwright/test'

test('remote sign-in, bearer/CSRF headers, one refresh, and explicit API failure without demo fallback', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'XSRF-TOKEN', value: 'test-csrf', url: 'http://127.0.0.1:3101' },
  ])
  let signedIn = false
  let refreshes = 0
  let refreshNext = false
  const loginHeaders: Record<string, string>[] = []
  const requestHeaders: Record<string, string>[] = []
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace('/api/v1', '')
    const reply = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/auth/login') {
      loginHeaders.push(req.headers())
      signedIn = true
      return reply(200, { accessToken: 'test-access-token' })
    }
    if (path === '/auth/refresh') {
      refreshes++
      return signedIn
        ? reply(200, { accessToken: 'refreshed-token' })
        : reply(401, { code: 'UNAUTHENTICATED', detail: 'Sign in required.' })
    }
    if (path === '/auth/logout') {
      signedIn = false
      return route.fulfill({ status: 204 })
    }
    if (!signedIn) return reply(401, { code: 'UNAUTHENTICATED', detail: 'Sign in required.' })
    if (path === '/auth/me')
      return reply(200, {
        userId: 'remote-user',
        employeeId: 'remote-person',
        tenantId: 'remote-tenant',
        name: 'Remote Person',
        roles: ['EMPLOYEE'],
        timeZone: 'Asia/Phnom_Penh',
      })
    if (path === '/requests/me') {
      requestHeaders.push(req.headers())
      if (refreshNext) {
        refreshNext = false
        return reply(401, { code: 'EXPIRED', detail: 'Token expired.' })
      }
      return reply(503, { code: 'SERVICE_UNAVAILABLE', detail: 'Requests service is unavailable.' })
    }
    if (path === '/attendance/today') return reply(200, { date: '2026-10-23', sessions: [] })
    return reply(200, { items: [], total: 0 })
  })
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open demo workspace' })).toHaveCount(0)
  await page.getByLabel('Workspace', { exact: true }).fill('my-company')
  await page.getByLabel('Work email').fill('person@example.test')
  await page.getByLabel('Password').fill('test-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Remote')
  expect(loginHeaders[0]!['x-xsrf-token']).toBe('test-csrf')
  expect(loginHeaders[0]!['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/)
  await expect(page.getByText('Demo workspace', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Demo role' })).toHaveCount(0)
  const before = refreshes
  refreshNext = true
  await page.getByRole('link', { name: 'Requests', exact: true }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Requests service is unavailable.' }),
  ).toBeVisible()
  expect(refreshes - before).toBe(1)
  expect(requestHeaders.at(-1)!.authorization).toBe('Bearer refreshed-token')
  await expect(page.getByText('A monitor for my desk', { exact: true })).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /token|session|password/i.test(k)),
    ),
  ).toBe(false)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
})

test('missing CSRF token prevents credentials being submitted', async ({ page }) => {
  let logins = 0
  await page.route('**/api/v1/**', async (route) => {
    if (route.request().url().endsWith('/auth/login')) logins++
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'UNAUTHENTICATED' }),
    })
  })
  await page.goto('/login')
  await page.getByLabel('Workspace', { exact: true }).fill('company')
  await page.getByLabel('Work email').fill('person@example.test')
  await page.getByLabel('Password').fill('test-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Sign-in could not be completed')
  expect(logins).toBe(0)
})
