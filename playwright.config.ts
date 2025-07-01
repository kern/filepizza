import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'node .next/standalone/server.js',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
})
