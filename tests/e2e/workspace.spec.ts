import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('employee workflows, role guards, offline mutations and mobile navigation', async ({
  page,
  context,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Good')
  await expect(page.getByText('Demo workspace', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clock in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Clock out', exact: true })).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Clock out', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'You are offline' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clock out', exact: true })).toBeVisible()
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Clock out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Clock in', exact: true })).toBeVisible()
  await page.goto('/requests')
  await page.getByRole('button', { name: 'New request' }).click()
  await page.getByLabel('What do you need?').fill('A better desk lamp')
  await page.getByRole('combobox', { name: 'Request type' }).click()
  await page.getByRole('option', { name: 'Material or equipment', exact: true }).click()
  await page.getByRole('combobox', { name: 'Material', exact: true }).click()
  await page.getByRole('option', { name: 'External monitor', exact: true }).click()
  await page.getByLabel('Reason').fill('A desk lamp for focused work.')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A better desk lamp' })).toBeVisible()
  await page.getByRole('button', { name: 'Submit for approval' }).click()
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Submit for approval' })).toHaveCount(0)
  await page.goto('/people')
  await expect(page.getByRole('heading', { name: 'This page needs another role' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Attendance', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Attendance', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.getByRole('dialog', { name: 'Workspace navigation' })).not.toBeVisible()
  await page.screenshot({ path: 'test-results/attendance-mobile.png', fullPage: true })
  const mobileAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(mobileAxe.violations.map((x) => x.id)).toEqual([])
  expect(errors).toEqual([])
})

test('admin directory, organization, reporting, preferences and accessibility', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Demo role' }).click()
  await page.getByRole('option', { name: 'HR administrator', exact: true }).click()
  await page.getByRole('link', { name: 'People', exact: true }).click()
  await page.getByRole('button', { name: 'Add a person' }).click()
  await page.getByLabel('Full name').fill('Kim Sample')
  await page.getByLabel('Work email', { exact: true }).fill('kim@example.test')
  await page.getByLabel('Department', { exact: true }).fill('Operations')
  await page.getByLabel('Position', { exact: true }).fill('Coordinator')
  await page.getByRole('button', { name: 'Create record', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Kim Sample', exact: true }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Organization', exact: true }).click()
  await page.getByRole('button', { name: 'Add a record' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Customer success')
  await page.getByLabel('Description').fill('A team for our customers')
  await page.getByRole('button', { name: 'Create record', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Customer success', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Reports', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Workday attendance' })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export leave CSV' }).click()
  expect((await download).suggestedFilename()).toBe('hrflow-demo-leave.csv')
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await page.getByRole('switch', { name: 'Helpful reminders' }).click()
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.getByRole('button', { name: 'Save preferences' })).toBeDisabled()
  await page.getByRole('link', { name: 'Overview', exact: true }).click()
  await page.setViewportSize({ width: 1440, height: 1050 })
  await expect(page.getByRole('heading', { name: 'Your time off' })).toBeVisible()
  await page.screenshot({ path: 'test-results/overview-desktop.png', fullPage: true })
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(
    results.violations.map((x) => ({ id: x.id, nodes: x.nodes.map((n) => n.target) })),
  ).toEqual([])
})

test('time off, correction review, request fulfillment and organization edit/delete', async ({
  page,
}) => {
  await page.goto('/leave')
  await page.getByRole('button', { name: 'Request time off', exact: true }).click()
  await page.getByRole('combobox', { name: 'Leave type', exact: true }).click()
  await page.getByRole('option', { name: 'Sick leave', exact: true }).click()
  await page.getByLabel('From', { exact: true }).fill('2030-02-04')
  await page.getByLabel('To', { exact: true }).fill('2030-02-05')
  await page.getByLabel('Reason').fill('A medical appointment and recovery.')
  await page.getByRole('button', { name: 'Send request', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sick leave', exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Demo role' }).click()
  await page.getByRole('option', { name: 'Manager', exact: true }).click()
  await page.getByRole('link', { name: 'Approvals', exact: false }).first().click()
  await page.getByRole('link', { name: 'View Sick leave', exact: true }).click()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Attendance', exact: true }).click()
  await page.getByRole('button', { name: 'Report an issue' }).click()
  await page.getByLabel('Affected date').fill('2026-10-22')
  await page.getByLabel('What happened?').fill('My clock-out time needs to be reviewed.')
  await page.getByRole('button', { name: 'Submit for review' }).click()
  await page.getByRole('link', { name: 'Approvals', exact: false }).first().click()
  await page.getByRole('button', { name: 'Attendance issues' }).click()
  await page.getByRole('button', { name: 'Reject', exact: true }).click()
  await page.getByLabel('Decision reason').fill('Please provide the original time first.')
  await page.getByRole('button', { name: 'Reject issue' }).click()
  await expect(page.getByRole('heading', { name: 'No issues to review' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Demo role' }).click()
  await page.getByRole('option', { name: 'HR administrator', exact: true }).click()
  await page.getByRole('link', { name: 'Requests', exact: true }).click()
  await page.getByRole('link', { name: 'View A monitor for my desk', exact: true }).click()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Approve', exact: true }).click()
  await page.getByRole('button', { name: 'Mark fulfilled' }).click()
  await page.getByRole('combobox', { name: 'Material', exact: true }).click()
  await page.getByRole('option', { name: 'External monitor', exact: true }).click()
  await page
    .getByLabel('Issue reason', { exact: true })
    .fill('Issued the approved external monitor.')
  await page.getByRole('button', { name: 'Record material issue', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mark fulfilled' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Organization', exact: true }).click()
  await page.getByRole('button', { name: 'Edit Operations', exact: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Workplace operations')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Workplace operations', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Workplace operations', exact: true }).click()
  await page.getByRole('button', { name: 'Delete record', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Workplace operations', exact: true })).toHaveCount(0)
})

test('all main screens remain accessible and material quantity can be edited', async ({ page }) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Demo role' }).click()
  await page.getByRole('option', { name: 'HR administrator', exact: true }).click()
  await expect(page.locator('.p-select-overlay')).toHaveCount(0)
  const failures: { path: string; violations: string[] }[] = []
  for (const path of [
    '/leave',
    '/requests',
    '/attendance',
    '/approvals',
    '/people',
    '/organization',
    '/reports',
    '/notifications',
    '/settings',
    '/profile',
  ]) {
    await page.locator(`a[href="${path}"]`).first().click()
    await expect(page.locator('.loading-stack')).toHaveCount(0)
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    if (scan.violations.length)
      failures.push({
        path,
        violations: scan.violations.map(
          (x) => `${x.id}: ${x.nodes.map((n) => n.target).join('; ')}`,
        ),
      })
  }
  await page.getByRole('link', { name: 'Organization', exact: true }).click()
  await page.getByRole('button', { name: 'Materials', exact: true }).click()
  await page.getByRole('button', { name: 'Edit External monitor', exact: true }).click()
  await page.getByLabel('Available quantity', { exact: true }).fill('12')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(
    page
      .getByRole('row', { name: /External monitor/ })
      .getByRole('cell', { name: '12', exact: true }),
  ).toBeVisible()
  expect(failures).toEqual([])
  expect(errors).toEqual([])
})

test('all 40 business workflow screens resolve and advanced HR journeys change state', async ({
  page,
}) => {
  test.setTimeout(180000)
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.goto('/workflows')
  await page.getByRole('combobox', { name: 'Demo role' }).click()
  await page.getByRole('option', { name: 'Owner', exact: true }).click()
  await expect(page.locator('.p-select-overlay')).toHaveCount(0)
  const workflowAxeFailures: {
    workflow: string
    violations: { id: string; targets: unknown[] }[]
  }[] = []
  for (let n = 1; n <= 40; n++) {
    const id = `BF-${String(n).padStart(3, '0')}`
    await page.locator('a[href="/workflows"]').first().click()
    await page.locator(`a[href="/workflows/${id}"]`).click()
    await expect(page.locator('.page-heading h1')).toBeVisible()
    await expect(page.locator('.loading-stack')).toHaveCount(0)
    await expect(
      page.getByRole('heading', { name: 'This workflow needs another role' }),
    ).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'We couldn’t load this' })).toHaveCount(0)
    await expect(page.locator('.p-select-overlay')).toHaveCount(0)
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    if (audit.violations.length)
      workflowAxeFailures.push({
        workflow: id,
        violations: audit.violations.map((x) => ({
          id: x.id,
          targets: x.nodes.map((n) => n.target),
        })),
      })
  }
  expect(workflowAxeFailures).toEqual([])
  await page.locator('a[href="/workflows"]').first().click()
  await page.locator('a[href="/workflows/BF-005"]').click()
  await page.getByRole('combobox', { name: 'Employee reference', exact: true }).click()
  await page.getByRole('option', { name: 'Sok Dara', exact: true }).click()
  await page.getByRole('combobox', { name: 'Shift reference', exact: true }).click()
  await page.getByRole('option', { name: 'Standard workday', exact: true }).click()
  await page.getByLabel('Effective from', { exact: true }).fill('2030-02-01')
  await page.getByLabel('Effective through', { exact: false }).fill('2030-02-28')
  await page.getByRole('button', { name: 'Assign a shift', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').locator('.p-tag')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await page.locator('a[href="/workflows"]').first().click()
  await page.locator('a[href="/workflows/BF-018"]').click()
  await page.getByRole('combobox', { name: 'Employee reference', exact: true }).click()
  await page.getByRole('option', { name: 'Sok Dara', exact: true }).click()
  await page.getByRole('combobox', { name: 'Leave type', exact: true }).click()
  await page.getByRole('option', { name: 'Annual leave', exact: true }).click()
  await page.getByLabel('Year', { exact: true }).fill(String(new Date().getFullYear()))
  await page.getByLabel('Adjustment in days', { exact: true }).fill('1.5')
  await page
    .getByLabel('Reason and supporting context', { exact: true })
    .fill('Additional entitlement reviewed by HR.')
  await page.getByRole('button', { name: 'Record entitlement adjustment', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').locator('.p-tag')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page
    .locator('.p-toast-close-button')
    .evaluateAll((nodes) => nodes.forEach((node) => (node as HTMLElement).click()))
  await expect(page.locator('.p-toast-close-button')).toHaveCount(0)
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement)?.blur()
    window.scrollTo(0, 0)
  })
  await page.getByRole('button', { name: /^Annual leave balance/ }).click()
  await expect(page.getByRole('dialog').getByText('11.5', { exact: true })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement)?.blur()
    window.scrollTo(0, 0)
  })
  await page.screenshot({ path: 'test-results/leave-ledger-desktop.png', fullPage: true })
  await page.locator('a[href="/workflows"]').first().click()
  await page.locator('a[href="/workflows/BF-026"]').click()
  await page.getByRole('combobox', { name: 'Request reference', exact: true }).click()
  await page.getByRole('option', { name: /^Request · A monitor for my desk/ }).click()
  await page.getByLabel('Private evidence file', { exact: true }).setInputFiles({
    name: 'workflow-evidence.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\nSynthetic test evidence'),
  })
  await page.getByRole('button', { name: 'Attach file', exact: true }).click()
  await expect(page.getByRole('dialog').locator('.p-tag')).toHaveText('Local Ready')
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const fileDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  expect((await fileDownload).suggestedFilename()).toBe('workflow-evidence.pdf')
  await page.locator('a[href="/workflows"]').first().click()
  await page.locator('a[href="/workflows/BF-030"]').click()
  await page.getByLabel('From date', { exact: true }).fill('2026-01-01')
  await page.getByLabel('Through date', { exact: true }).fill('2026-12-31')
  await page.getByRole('button', { name: 'Prepare CSV export', exact: true }).click()
  await expect(page.getByRole('dialog').locator('.p-tag')).toHaveText('Completed')
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const reportDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  expect((await reportDownload).suggestedFilename()).toBe('hrflow-leave-export.csv')

  await page.locator('a[href="/workflows"]').first().click()
  await page
    .locator('.p-toast-close-button')
    .evaluateAll((nodes) => nodes.forEach((node) => (node as HTMLElement).click()))
  await expect(page.locator('.p-toast-close-button')).toHaveCount(0)
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement)?.blur()
    window.scrollTo(0, 0)
  })
  await page.screenshot({ path: 'test-results/workflows-desktop.png', fullPage: true })
  expect(pageErrors).toEqual([])
})
