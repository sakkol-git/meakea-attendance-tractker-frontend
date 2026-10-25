import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROME_PATH ||
        (process.platform === 'darwin'
          ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          : undefined),
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'demo',
      testMatch: ['workspace.spec.ts', 'alignment.spec.ts'],
      use: { baseURL: 'http://127.0.0.1:3100' },
    },
    {
      name: 'remote-contract',
      testMatch: 'remote.spec.ts',
      use: { baseURL: 'http://127.0.0.1:3101' },
    },
  ],
  reporter: [['list']],
  webServer: [
    {
      command: 'npm run build && node tests/serve-app.mjs local',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'node tests/serve-app.mjs remote',
      url: 'http://127.0.0.1:3101',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
})
