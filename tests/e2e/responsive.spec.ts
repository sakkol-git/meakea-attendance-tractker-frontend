import { expect, test } from '@playwright/test'

const routes = [
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
]

const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 1050 },
]

test('main workflows fit phone, tablet and desktop viewports', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Demo role' }).click()
  await page.getByRole('option', { name: 'HR administrator', exact: true }).click()
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
