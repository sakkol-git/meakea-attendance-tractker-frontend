import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['tests/live-provider.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    maxWorkers: 1,
  },
})
