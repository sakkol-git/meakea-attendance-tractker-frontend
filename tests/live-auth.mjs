import { chromium, expect } from '@playwright/test'

const password = process.env.HRFLOW_DEV_PASSWORD
if (!password) throw new Error('Set HRFLOW_DEV_PASSWORD to the local seed password.')
const url = process.env.HRFLOW_WEB_URL ?? 'http://localhost:3001'
const executablePath =
  process.env.PLAYWRIGHT_CHROME_PATH ||
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : undefined)
const browser = await chromium.launch({ headless: true, executablePath })
try {
  const page = await browser.newPage()
  await page.goto(`${url}/login`)
  await page.getByLabel('Workspace', { exact: true }).fill('demo')
  await page.getByLabel('Work email').fill('owner@example.test')
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(`${url}/`)
  await expect(page.locator('h1').first()).toContainText('Local')
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => /token|session|password/i.test(key)),
    ),
  ).toBe(false)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  console.log('Live web sign-in and sign-out passed through the gateway.')
} finally {
  await browser.close()
}
