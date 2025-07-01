import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'PORT=4100 node .next/standalone/server.js',
    port: 4100,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
})
