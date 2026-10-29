import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('focused request sections keep entries while the review follows edits', async ({ page }) => {
  await page.goto('/requests')
  await page.getByRole('button', { name: 'New request' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('What do you need?').fill('Work from another location')
  await dialog
    .getByLabel('Reason', { exact: true })
    .fill('Working remotely for a family appointment.')
  await dialog.getByRole('combobox', { name: 'Request type' }).click()
  await page.getByRole('option', { name: 'Remote work', exact: true }).click()
  await dialog.getByLabel('From', { exact: true }).fill('2026-11-02')
  await dialog.getByLabel('To', { exact: true }).fill('2026-11-03')
  await dialog.getByText('Review details', { exact: true }).click()
  const review = dialog.getByRole('region', { name: 'Request review' })
  await expect(review).toContainText('Remote work')
  await expect(review).toContainText('2026-11-03')
  await expect(review).toContainText('Save a draft, then submit it from the request details.')
  await dialog.getByLabel('To', { exact: true }).fill('2026-11-04')
  await expect(review).toContainText('2026-11-04')
  await expect(dialog.getByLabel('Reason', { exact: true })).toHaveValue(
    'Working remotely for a family appointment.',
  )
})

test('dark appearance persists and core screens remain readable', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/settings')
  await page.getByRole('combobox', { name: 'Appearance', exact: true }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/hrflow-dark/)
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(14, 21, 19)',
  )
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/hrflow-dark/)
  await page.getByRole('combobox', { name: 'Demo role' }).click()
  await page.getByRole('option', { name: 'Owner', exact: true }).click()
  const failures: unknown[] = []
  for (const route of [
    '/',
    '/attendance',
    '/leave',
    '/requests',
    '/approvals',
    '/people',
    '/organization',
    '/reports',
    '/notifications',
    '/settings',
    '/profile',
    '/audit',
    '/workflows',
  ]) {
    await page
      .locator(`a[href="${route}"]`)
      .first()
      .evaluate((link: HTMLAnchorElement) => link.click())
    await expect(page).toHaveURL(new RegExp(`${route === '/' ? '/$' : route + '$'}`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.loading-stack')).toHaveCount(0)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    failures.push(
      ...results.violations.map((item) => ({
        route,
        id: item.id,
        nodes: item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
      })),
    )
  }
  expect(failures).toEqual([])
  await page.locator('a[href="/settings"]').first().click()
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.getByRole('combobox', { name: 'Appearance', exact: true }).click()
  await page.getByRole('option', { name: 'Use device setting', exact: true }).click()
  await expect(page.locator('html')).not.toHaveClass(/hrflow-dark/)
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveClass(/hrflow-dark/)
  await page.getByRole('combobox', { name: 'Appearance', exact: true }).click()
  await page.getByRole('option', { name: 'Light', exact: true }).click()
  await expect(page.locator('html')).not.toHaveClass(/hrflow-dark/)
})

test('request form errors are announced without losing entered values', async ({ page }) => {
  await page.goto('/requests')
  await page.getByRole('button', { name: 'New request' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('What do you need?').fill('Desk equipment')
  await dialog.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(
    dialog.getByRole('alert').filter({ hasText: 'Check the highlighted fields' }),
  ).toBeVisible()
  await expect(dialog.getByLabel('What do you need?')).toHaveValue('Desk equipment')
  await expect(dialog.getByRole('combobox', { name: 'Request type' })).toBeFocused()
})

test('empty filtered lists offer a direct way back to records', async ({ page }) => {
  await page.goto('/requests')
  await page.getByRole('textbox', { name: 'Search records' }).fill('no-such-request-81725')
  await expect(page.getByText('No records match your filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search records' })).toHaveValue('')
  await expect(page.getByText('No records match your filters.')).not.toBeVisible()
})

test('request filters survive a detail visit and clear on account change', async ({ page }) => {
  await page.goto('/requests')
  await page.getByRole('textbox', { name: 'Search records' }).fill('monitor')
  await page.getByRole('link', { name: 'A monitor for my desk', exact: false }).first().click()
  await page.getByRole('link', { name: 'Back to requests' }).click()
  await expect(page.getByRole('textbox', { name: 'Search records' })).toHaveValue('monitor')
  await page.getByRole('combobox', { name: 'Demo role' }).click()
  await page.getByRole('option', { name: 'Manager', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search records' })).toHaveValue('')
})

test('attendance corrections use company-clock date controls with original context', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/attendance')
  await page.getByRole('button', { name: 'Request correction', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Affected date').fill('2026-10-22')
  await expect(dialog.getByText('Original recorded time')).toBeVisible()
  await expect(dialog.getByText(/Choose dates and times in Asia\/Phnom_Penh/)).toBeVisible()
  await dialog.getByLabel('Proposed clock-in', { exact: true }).fill('2026-10-22T08:30')
  await dialog.getByLabel('Proposed clock-out (optional)', { exact: true }).fill('2026-10-22T17:30')
  await page.setViewportSize({ width: 390, height: 844 })
  const lastField = dialog.getByLabel('Proposed clock-out (optional)', { exact: true })
  await lastField.focus()
  const fieldBounds = await lastField.boundingBox()
  const contentBounds = await dialog.locator('.p-dialog-content').boundingBox()
  const actionBounds = await dialog.getByRole('button', { name: 'Submit for review' }).boundingBox()
  expect(fieldBounds!.y + fieldBounds!.height).toBeLessThanOrEqual(actionBounds!.y)
  expect(fieldBounds!.y + fieldBounds!.height).toBeLessThanOrEqual(
    contentBounds!.y + contentBounds!.height,
  )
  await dialog.getByLabel('What happened?').fill('Forgot to tap when arriving at the office.')
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(accessibility.violations.map((violation) => violation.id)).toEqual([])
  await dialog.getByRole('button', { name: 'Submit for review' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Attendance correction submitted for review')).toBeVisible()
})

test('mobile-aligned approvals, delegation and accessible coverage view', async ({ page }) => {
  test.setTimeout(60_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Demo role' }).click()
  await page.getByRole('option', { name: 'Manager', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Demo role' })).toContainText('Manager')
  await page.getByRole('link', { name: 'Approvals', exact: false }).first().click()

  await expect(page.getByRole('textbox', { name: 'Search approvals' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Filter waiting age' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Sort approvals' })).toContainText('Oldest first')
  await page.screenshot({ path: 'test-results/aligned-approvals.png', fullPage: true })

  await page.getByRole('link', { name: 'Manage delegation' }).click()
  await page.getByRole('button', { name: 'New delegation' }).click()
  await page.getByRole('combobox', { name: 'Reviewer', exact: true }).click()
  await page.getByRole('option', { name: 'Kim Sreyneang' }).click()
  await page.getByLabel('Start date · Required', { exact: true }).fill('2030-02-01')
  await page.getByLabel('End date · Required', { exact: true }).fill('2030-02-07')
  await page.getByLabel('Reason · Required', { exact: true }).fill('Annual leave review coverage')
  await page.getByRole('button', { name: 'Create delegation' }).click()
  await expect(page.getByRole('cell', { name: 'Kim Sreyneang' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel delegation' }).click()
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible()

  await page.goto('/leave')
  await page.getByRole('button', { name: 'Team calendar' }).click()
  await page.getByRole('button', { name: 'Accessible list' }).click()
  await expect(page.getByText(/of \d+ off, coverage/).first()).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.map((violation) => violation.id)).toEqual([])
})

test('keyboard users can skip navigation and leave a dialog safely', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(response?.headers()['x-content-type-options']).toBe('nosniff')
  expect(response?.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  const skipLink = page.getByRole('link', { name: 'Skip to content' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  let firstInteractive = ''
  for (let attempt = 0; attempt < 4 && !firstInteractive; attempt++) {
    await page.keyboard.press('Tab')
    firstInteractive = await page.evaluate(() =>
      ['BODY', 'HTML'].includes(document.activeElement?.tagName ?? '')
        ? ''
        : document.activeElement?.textContent?.trim() || '',
    )
  }
  expect(firstInteractive).toBe('Skip to content')
  await expect(skipLink).toBeFocused()
  await expect(skipLink).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()

  await page.goto('/requests')
  const trigger = page.getByRole('button', { name: 'New request' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
})
