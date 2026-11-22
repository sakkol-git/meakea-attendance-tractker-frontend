import { expect, test } from '@playwright/test'

test('attachment listing retries and a failed download remains retryable', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'XSRF-TOKEN', value: 'fixture', url: 'http://127.0.0.1:3101' }])
  let signedIn = false
  let detailReads = 0
  let downloads = 0
  let releaseDownload: (() => void) | undefined
  const detail = {
    id: 'request-a',
    employeeId: 'employee-a',
    employeeName: 'Fixture employee',
    title: 'Private request',
    type: 'GENERAL',
    status: 'DRAFT',
    version: 0,
    reason: 'Fixture request',
    attachments: [
      {
        id: 'proof',
        fileName: 'proof.pdf',
        fileSize: 10,
        contentType: 'application/pdf',
        status: 'FINALIZED',
        createdAt: '2026-11-22T00:00:00Z',
      },
    ],
  }
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    const reply = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/auth/login') {
      signedIn = true
      return reply(200, { accessToken: 'fixture-access' })
    }
    if (!signedIn) return reply(401, { detail: 'Sign in' })
    if (path === '/auth/me')
      return reply(200, {
        employeeId: 'employee-a',
        tenantId: 'fixture-tenant',
        name: 'Fixture employee',
        roles: ['EMPLOYEE'],
        timeZone: 'Asia/Phnom_Penh',
      })
    if (path === '/requests/request-a') {
      detailReads++
      if (detailReads === 2) return reply(503, { detail: 'Attachment list unavailable.' })
      return reply(200, detail)
    }
    if (path.endsWith('/download')) {
      downloads++
      if (downloads === 1)
        await new Promise<void>((resolve) => {
          releaseDownload = resolve
        })
      return reply(403, { detail: 'Private download denied.' })
    }
    if (path === '/attendance/today') return reply(200, { date: '2026-11-22', sessions: [] })
    return reply(200, { items: [], total: 0, page: 0, size: 25 })
  })
  await page.goto('/login')
  await page.getByLabel('Workspace', { exact: true }).fill('fixture')
  await page.getByLabel('Work email').fill('employee@example.test')
  await page.getByLabel('Password', { exact: true }).fill('synthetic-fixture')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/requests/request-a')
  const manager = page.locator('.attachment-manager')
  await expect(manager.getByRole('alert')).toContainText('Attachment list unavailable.')
  await expect(manager.getByText('No attachments have been added.')).toHaveCount(0)
  await manager.getByRole('button', { name: 'Retry attachments', exact: true }).click()
  const download = manager.getByRole('button', { name: 'Download proof.pdf', exact: true })
  await expect(download).toBeVisible()
  await expect(manager.getByRole('alert')).toHaveCount(0)
  await download.click()
  await expect.poll(() => downloads).toBe(1)
  await expect(download).toBeDisabled()
  releaseDownload!()
  await expect(manager.getByRole('alert')).toHaveText('Private download denied.')
  await expect(download).toBeEnabled()
  await download.click()
  await expect.poll(() => downloads).toBe(2)
})
