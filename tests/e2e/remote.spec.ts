import { expect, test } from '@playwright/test'

test('first-use pages guide UAT users without offering unavailable setup or reset commands', async ({
  page,
}) => {
  const unsupported: string[] = []
  await page.route('**/api/v1/**', async (route) => {
    if (
      /\/(auth\/(setup|forgot-password|reset-password)|tenants)$/.test(
        new URL(route.request().url()).pathname,
      )
    )
      unsupported.push(route.request().url())
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Sign in required.' }),
    })
  })
  for (const path of ['/setup', '/forgot-password', '/reset-password']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Get access to your workspace' })).toBeVisible()
    await expect(
      page.getByText('Ask HR for your company workspace, linked account and sign-in instructions.'),
    ).toBeVisible()
    await expect(page.locator('form')).toHaveCount(0)
  }
  await page.getByRole('link', { name: 'Sign-in and getting started help' }).click()
  await expect(
    page.getByRole('heading', { name: 'Help and getting started', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What is my workspace?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Location access' })).toBeVisible()
  expect(unsupported).toEqual([])
})

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
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Show password', exact: true }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password', exact: true }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password')
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
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Sign-in could not be completed')
  expect(logins).toBe(0)
})

test('live attendance report shows provider facts and downloads private CSV with bearer authentication', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'XSRF-TOKEN', value: 'csv-csrf', url: 'http://127.0.0.1:3101' },
  ])
  let dashboardReads = 0
  let downloadAuthorization = ''
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const reply = (status: number, data: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (path === '/auth/login' || path === '/auth/refresh')
      return reply(200, { accessToken: 'csv-access' })
    if (path === '/auth/me')
      return reply(200, {
        userId: 'admin-user',
        employeeId: 'admin-employee',
        tenantId: 'report-tenant',
        name: 'Report Admin',
        roles: ['HR_ADMIN'],
        timeZone: 'Asia/Phnom_Penh',
      })
    if (path === '/attendance/today') return reply(200, { date: '2026-10-28', sessions: [] })
    if (path === '/reports/dashboard') {
      dashboardReads++
      return reply(503, { detail: 'Daily summary unavailable' })
    }
    if (path === '/reports/attendance/summary')
      return reply(200, {
        totalCount: 1,
        records: [
          {
            id: 'fact',
            sessionId: 'session',
            employeeId: 'employee-42',
            workDate: '2026-10-28',
            status: 'OPEN',
            minutesLate: 0,
            minutesWorked: null,
            aggregateRevision: 1,
            clockIn: '2026-10-28T01:00:00Z',
            clockOut: null,
            timezone: 'Asia/Phnom_Penh',
            source: 'TAP',
          },
        ],
      })
    if (path === '/reports/exports' && request.method() === 'POST') {
      expect(request.postDataJSON()).toEqual({ report: 'ATTENDANCE', format: 'CSV' })
      return reply(202, { id: 'export-42', status: 'QUEUED', version: 1 })
    }
    if (path === '/reports/exports/export-42')
      return reply(200, {
        id: 'export-42',
        status: 'COMPLETED',
        version: 3,
        downloadUrl: '/api/v1/reports/exports/export-42/download',
      })
    if (path === '/reports/exports/export-42/download') {
      downloadAuthorization = request.headers().authorization ?? ''
      return route.fulfill({
        status: 200,
        contentType: 'text/csv',
        body: 'employeeId,state\nemployee-42,OPEN\n',
      })
    }
    return reply(200, { items: [], total: 0 })
  })
  await page.goto('/login')
  await page.getByLabel('Workspace', { exact: true }).fill('company')
  await page.getByLabel('Work email').fill('admin@example.test')
  await page.getByLabel('Password', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Tasks', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible()
  await expect(page.locator('main a[href^="/workflows/BF-"]')).toHaveCount(0)
  await expect(page.getByText('Developer demo catalog', { exact: true })).toHaveCount(0)
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Reports', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Attendance records', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'employee-42', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'In progress', exact: true })).toBeVisible()
  await expect(page.getByText('Average attendance rate', { exact: true })).toHaveCount(0)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export attendance CSV', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('export-42.csv')
  expect(downloadAuthorization).toBe('Bearer csv-access')
  expect(dashboardReads).toBe(0)
})

test('remote leave uses owner catalog and preview, submits its code, and shows preview failure honestly', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'XSRF-TOKEN', value: 'leave-csrf', url: 'http://127.0.0.1:3101' },
  ])
  let signedIn = false
  let rejectPreview = false
  const submitted: unknown[] = []
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const reply = (status: number, data: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (path === '/auth/login') {
      signedIn = true
      return reply(200, { accessToken: 'leave-fixture' })
    }
    if (!signedIn) return reply(401, { detail: 'Sign in required.' })
    if (path === '/auth/me')
      return reply(200, {
        userId: 'account',
        employeeId: 'employee',
        tenantId: 'tenant',
        name: 'Leave Tester',
        roles: ['EMPLOYEE'],
        timeZone: 'Asia/Phnom_Penh',
      })
    if (path === '/attendance/today') return reply(200, { date: '2026-10-29', sessions: [] })
    if (path === '/leave/requests/me') {
      const page = Number(new URL(request.url()).searchParams.get('page'))
      const rows = Array.from({ length: 26 }, (_, index) => ({
        id: `leave-${index + 1}`,
        title: `My request ${index + 1}`,
        type: 'UNPAID',
        startDate: '2026-11-02',
        endDate: '2026-11-02',
        status: 'PENDING',
        version: 0,
      }))
      return reply(200, {
        items: rows.slice(page * 25, (page + 1) * 25),
        page,
        size: 25,
        total: 26,
      })
    }
    if (path === '/leave/types')
      return reply(200, {
        items: [
          {
            id: 'unpaid-id',
            code: 'UNPAID',
            name: 'Owner unpaid leave',
            paid: false,
            allowHalfDay: true,
            evidenceRequired: false,
            minimumNoticeDays: 0,
          },
        ],
        page: 0,
        size: 100,
        total: 1,
      })
    if (path === '/leave/requests/preview')
      return rejectPreview
        ? reply(503, { detail: 'Assigned calendar is not available.' })
        : reply(200, {
            chargeableDays: 0.5,
            balanceTracked: false,
            balanceBefore: null,
            balanceAfter: null,
            allowHalfDay: true,
            evidenceRequired: false,
            minimumNoticeDays: 0,
            warnings: ['Owner calendar preview.'],
          })
    if (path === '/leave/requests' && request.method() === 'POST') {
      submitted.push(request.postDataJSON())
      return reply(200, { id: 'leave-result', version: 0, status: 'PENDING', type: 'UNPAID' })
    }
    return reply(200, { items: [], total: 0, page: 0, size: 25 })
  })
  await page.goto('/login')
  await page.getByLabel('Workspace', { exact: true }).fill('uat')
  await page.getByLabel('Work email').fill('leave@example.test')
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leave')
  await page.getByRole('link', { name: 'Leave', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Leave', exact: true })).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Result pages' })
    .getByRole('button', { name: 'Next', exact: true })
    .click()
  await expect(page.getByRole('link', { name: /^My request 26/ })).toBeVisible()
  await page.getByRole('button', { name: 'Request leave', exact: true }).first().click()
  await page.getByRole('combobox', { name: 'Leave type', exact: true }).click()
  await page.getByRole('option', { name: 'Owner unpaid leave', exact: true }).click()
  await page.getByLabel('From', { exact: true }).fill('2026-11-02')
  await page.getByLabel('To', { exact: true }).fill('2026-11-02')
  await page.getByRole('combobox', { name: 'Day portion', exact: true }).click()
  await page.getByRole('option', { name: 'Morning only', exact: true }).click()
  await expect(page.getByText('0.5 working days', { exact: true })).toBeVisible()
  await expect(page.getByText('Balance: Not tracked', { exact: true })).toBeVisible()
  await expect(page.getByText('Owner calendar preview.', { exact: true })).toBeVisible()
  rejectPreview = true
  await page.getByLabel('To', { exact: true }).fill('2026-11-03')
  await expect(page.getByText('Assigned calendar is not available.', { exact: true })).toBeVisible()
  await expect(page.getByText(/weekend day\(s\)/)).toHaveCount(0)
  rejectPreview = false
  await page.getByLabel('To', { exact: true }).fill('2026-11-02')
  await page.getByLabel('Reason', { exact: true }).fill('An owner-calculated UAT request.')
  await page.getByRole('button', { name: 'Send request', exact: true }).click()
  await expect.poll(() => submitted.length).toBe(1)
  expect(submitted[0]).toMatchObject({ type: 'UNPAID', portion: 'MORNING' })
  expect(submitted[0]).not.toHaveProperty('leaveTypeId')
})

test('remote attachments show persisted files and keep failed transfers as failures with stable retry keys', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'XSRF-TOKEN', value: 'csrf', url: 'http://127.0.0.1:3101' }])
  let signedIn = false,
    complete = false,
    failCompletion = true
  const keys: { path: string; key: string | undefined }[] = []
  const attachment = (id: string, name: string) => ({
    id,
    fileName: name,
    fileSize: 10,
    contentType: 'application/pdf',
    status: 'FINALIZED',
    createdAt: '2026-10-29T00:00:00Z',
  })
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname.replace('/api/v1', '')
    const reply = (status: number, data: unknown, headers: Record<string, string> = {}) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
        headers,
      })
    if (path === '/auth/login') {
      signedIn = true
      return reply(200, { accessToken: 'access' })
    }
    if (!signedIn) return reply(401, { code: 'UNAUTHENTICATED', detail: 'Sign in' })
    if (path === '/auth/me')
      return reply(200, {
        employeeId: 'employee-a',
        tenantId: 'tenant-a',
        name: 'Remote Employee',
        roles: ['EMPLOYEE'],
        timeZone: 'Asia/Phnom_Penh',
      })
    if (path === '/attendance/today') return reply(200, { date: '2026-10-29', sessions: [] })
    if (path === '/requests/me')
      return reply(200, {
        items: [
          {
            id: 'request-a',
            title: 'Actual request',
            type: 'GENERAL',
            status: 'DRAFT',
            version: 0,
          },
        ],
        page: 0,
        size: 25,
        total: 1,
      })
    if (path === '/requests/request-a')
      return reply(
        200,
        {
          id: 'request-a',
          employeeId: 'employee-a',
          employeeName: 'Remote Employee',
          title: 'Actual request',
          type: 'GENERAL',
          status: 'DRAFT',
          version: 0,
          reason: 'Private context',
          attachments: [
            attachment('file-old', 'existing-proof.pdf'),
            ...(complete ? [attachment('file-a', 'proof.pdf')] : []),
          ],
        },
        { etag: '"0"' },
      )
    if (path.endsWith('/presign')) {
      keys.push({ path, key: request.headers()['idempotency-key'] })
      return reply(200, {
        attachmentId: 'file-a',
        uploadUrl: '/api/v1/requests/request-a/attachments/file-a/upload',
      })
    }
    if (path.endsWith('/upload')) {
      expect(request.headers().authorization).toBe('Bearer access')
      return route.fulfill({ status: 200 })
    }
    if (path.endsWith('/complete')) {
      keys.push({ path, key: request.headers()['idempotency-key'] })
      if (failCompletion) {
        failCompletion = false
        return reply(503, {
          code: 'UNAVAILABLE',
          detail: 'Completion outcome unknown. Retry this attachment.',
        })
      }
      complete = true
      return reply(200, {
        id: 'file-a',
        title: 'proof.pdf',
        status: 'FINALIZED',
        version: 1,
        createdAt: '2026-10-29T00:00:00Z',
        details: {},
        history: [],
      })
    }
    if (path.endsWith('/download'))
      return reply(403, { code: 'FORBIDDEN', detail: 'Private download denied.' })
    const url = new URL(request.url())
    return reply(200, {
      items: [],
      total: 0,
      page: Number(url.searchParams.get('page') ?? 0),
      size: Number(url.searchParams.get('size') ?? 25),
    })
  })
  await page.goto('/login')
  await page.getByLabel('Workspace', { exact: true }).fill('demo')
  await page.getByLabel('Work email').fill('employee@example.test')
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.getByRole('link', { name: 'Requests', exact: true }).click()
  await page.getByRole('link', { name: 'Actual request' }).first().click()
  const manager = page.locator('.attachment-manager')
  await expect(manager.getByText('existing-proof.pdf', { exact: true })).toBeVisible()
  await expect(manager.getByText('supporting_document.pdf', { exact: true })).toHaveCount(0)
  await manager.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(manager.getByRole('alert')).toHaveText('Private download denied.')
  const file = { name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-proof') }
  await manager.locator('input[type=file]').setInputFiles(file)
  await expect(manager.getByRole('alert')).toContainText('Completion outcome unknown')
  await expect(manager.getByRole('heading', { name: 'Attachments (1)', exact: true })).toBeVisible()
  await manager.locator('input[type=file]').setInputFiles(file)
  await expect(manager.getByRole('heading', { name: 'Attachments (2)', exact: true })).toBeVisible()
  expect(keys[0]!.key).toBe(keys[2]!.key)
  expect(keys[1]!.key).toBe(keys[3]!.key)
})

test('notification domain links use real local views and unknown legacy notices stay readable', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'XSRF-TOKEN', value: 'notice-csrf', url: 'http://127.0.0.1:3101' },
  ])
  let signedIn = false
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace('/api/v1', '')
    const reply = (status: number, data: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (path === '/auth/login') {
      signedIn = true
      return reply(200, { accessToken: 'notice-access' })
    }
    if (!signedIn) return reply(401, { detail: 'Sign in required.' })
    if (path === '/auth/me')
      return reply(200, {
        employeeId: 'employee-a',
        tenantId: 'tenant-a',
        name: 'Notification Employee',
        roles: ['EMPLOYEE'],
        timeZone: 'Asia/Phnom_Penh',
      })
    if (path === '/attendance/today') return reply(200, { date: '2026-10-29', sessions: [] })
    if (path === '/notifications')
      return reply(200, {
        items: [
          {
            id: 'notice-a',
            title: 'Request decision',
            read: false,
            kind: 'request',
            recordId: 'request-a',
            to: null,
          },
          {
            id: 'notice-b',
            title: 'Attendance update',
            read: false,
            kind: 'attendance',
            recordId: 'session-a',
            to: '',
          },
          { id: 'notice-c', title: 'Legacy update', read: false, to: null },
        ],
        page: Number(url.searchParams.get('page') ?? 0),
        size: Number(url.searchParams.get('size') ?? 100),
        total: 3,
      })
    return reply(200, {
      items: [],
      total: 0,
      page: Number(url.searchParams.get('page') ?? 0),
      size: Number(url.searchParams.get('size') ?? 25),
    })
  })
  await page.goto('/login')
  await page.getByLabel('Workspace', { exact: true }).fill('demo')
  await page.getByLabel('Work email').fill('employee@example.test')
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.getByRole('link', { name: 'Open notifications' }).first().click()
  const row = (title: string) =>
    page
      .locator('.notice-row')
      .filter({ has: page.getByRole('heading', { name: title, exact: false }) })
  await expect(row('Request decision').getByRole('link', { name: 'View update' })).toHaveAttribute(
    'href',
    '/requests/request-a',
  )
  await expect(row('Attendance update').getByRole('link', { name: 'View update' })).toHaveAttribute(
    'href',
    '/attendance',
  )
  await expect(row('Legacy update').getByRole('link')).toHaveCount(0)
  await expect(row('Legacy update').getByRole('button', { name: 'Mark read' })).toBeVisible()
})
