import { expect, test } from '@playwright/test'

const routes = [
  '/',
  '/workflows',
  '/attendance',
  '/leave',
  '/requests',
  '/approvals',
  '/people',
  '/organization',
  '/audit',
  '/reports',
  '/notifications',
  '/settings',
  '/profile',
]

const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 1050 },
]

test('main workflows fit phone, tablet, laptop and desktop viewports', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Demo role' }).click()
  await page.getByRole('option', { name: 'Owner', exact: true }).click()
  await expect(page.locator('.p-select-overlay')).toHaveCount(0)

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const path of routes) {
      if (path === '/') {
        await page
          .locator('a[href="/"]')
          .first()
          .evaluate((link: HTMLAnchorElement) => link.click())
      } else {
        await page
          .locator(`a[href="${path}"]`)
          .first()
          .evaluate((link: HTMLAnchorElement) => link.click())
      }
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('.loading-stack')).toHaveCount(0)
      await expect(page.locator('.page-heading h1')).toHaveCount(1)
      const design = await page.evaluate(() => ({
        fontFamily: getComputedStyle(document.body).fontFamily,
        panelRadii: [...document.querySelectorAll<HTMLElement>('.panel')]
          .filter((element) => element.offsetParent !== null)
          .map((element) => getComputedStyle(element).borderRadius),
        smallTargets: [
          ...document.querySelectorAll<HTMLElement>(
            '.p-button, .p-select, .p-toggleswitch, input:not([type="hidden"]):not(.p-toggleswitch-input), textarea, a.view-link, a.notification-link, a.account-link, a.text-link',
          ),
        ]
          .filter((element) => element.offsetParent !== null)
          .filter((element) => element.getBoundingClientRect().height < 43.5)
          .slice(0, 8)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: element.className.toString(),
            height: Math.round(element.getBoundingClientRect().height),
          })),
      }))
      expect(design.fontFamily).toContain('Kantumruy Pro')
      expect(
        design.panelRadii.every((radius) => radius === '16px'),
        `${viewport.name} panel radius on ${path}: ${design.panelRadii.join(', ')}`,
      ).toBe(true)
      expect(design.smallTargets, `${viewport.name} touch targets on ${path}`).toEqual([])
      const overflow = await page.evaluate(() => {
        const contained = (element: HTMLElement) => {
          for (
            let parent = element.parentElement;
            parent && parent !== document.body;
            parent = parent.parentElement
          ) {
            const overflowX = getComputedStyle(parent).overflowX
            if (['auto', 'scroll', 'hidden', 'clip'].includes(overflowX)) return true
          }
          return false
        }
        window.scrollTo(100_000, 0)
        const rootScroll = window.scrollX
        window.scrollTo(0, 0)
        return {
          fits: rootScroll === 0,
          elements: [...document.querySelectorAll<HTMLElement>('body *')]
            .filter((element) => {
              const box = element.getBoundingClientRect()
              return (
                box.width > 0 &&
                (box.right > window.innerWidth + 1 || box.left < -1) &&
                !contained(element)
              )
            })
            .slice(0, 8)
            .map((element) => ({
              tag: element.tagName.toLowerCase(),
              className: element.className.toString(),
              width: Math.round(element.getBoundingClientRect().width),
              right: Math.round(element.getBoundingClientRect().right),
            })),
        }
      })
      expect(overflow, `${viewport.name} overflow on ${path}`).toEqual({ fits: true, elements: [] })
    }
  }
})

test('request dialog remains usable on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/requests')
  await page.getByRole('button', { name: 'New request' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const bounds = await dialog.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568)

  await expect(dialog.getByRole('button', { name: /save draft/i })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /cancel/i })).toBeVisible()
})

test('attendance cards keep dates, times and status readable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/attendance')
  const first = page.locator('.attendance-session-card').first()
  await expect(first).toBeVisible()
  await expect(first.getByText('Completed', { exact: true })).toBeVisible()
  await expect(first.getByText('Clock in', { exact: true })).toBeVisible()
  await expect(first.getByText('Clock out', { exact: true })).toBeVisible()
  await expect(page.locator('.attendance-session-table')).not.toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/attendance-cards-phone.png', fullPage: true })
})

test('task menus keep technical processes out of normal navigation', async ({ page }) => {
  await page.goto('/workflows')
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Refresh token rotation/ })).not.toBeVisible()
  await expect(page.getByRole('link', { name: /My schedule/ })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }).getByText('Workflows'),
  ).toHaveCount(0)
})

test('authentication and onboarding pages share responsive foundations', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    for (const path of ['/login', '/forgot-password', '/reset-password', '/setup']) {
      await page.goto(path)
      await expect(page.locator('.login-shell')).toBeVisible()
      const audit = await page.evaluate(() => ({
        fits: document.documentElement.scrollWidth <= window.innerWidth + 1,
        fontFamily: getComputedStyle(document.body).fontFamily,
        smallTargets: [...document.querySelectorAll<HTMLElement>('.p-button, input, a.text-link')]
          .filter((element) => element.offsetParent !== null)
          .filter((element) => element.getBoundingClientRect().height < 43.5)
          .map((element) => ({
            className: element.className.toString(),
            height: Math.round(element.getBoundingClientRect().height),
          })),
      }))
      expect(audit.fits, `${path} at ${viewport.width}px`).toBe(true)
      expect(audit.fontFamily).toContain('Kantumruy Pro')
      expect(audit.smallTargets, `${path} touch targets at ${viewport.width}px`).toEqual([])
    }
  }
})
