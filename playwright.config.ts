import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'HOSTNAME=127.0.0.1 PORT=4100 node .next/standalone/server.js',
    port: 4100,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
