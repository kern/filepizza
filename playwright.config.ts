import { defineConfig, devices } from '@playwright/test'

const NO_WEBRTC_SPEC = /firefox-no-webrtc\.test\.ts$/

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1, // Run tests serially to avoid WebRTC port conflicts
  webServer: {
    command: 'node .output/server/index.mjs',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
  // Every spec runs in each engine. Run one with `pnpm test:e2e --project=webkit`.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: NO_WEBRTC_SPEC,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: NO_WEBRTC_SPEC,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: NO_WEBRTC_SPEC,
    },
    {
      // Firefox with the real about:config switch from #288 flipped off.
      name: 'firefox-no-webrtc',
      testMatch: NO_WEBRTC_SPEC,
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: { 'media.peerconnection.enabled': false },
        },
      },
    },
  ],
})
