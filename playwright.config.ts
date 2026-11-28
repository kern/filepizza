import { defineConfig, devices } from '@playwright/test'

// Specs that only make sense in one engine, each with its own project below.
const NO_WEBRTC_SPEC = /firefox-no-webrtc\.test\.ts$/
const FIREFOX_SPEC = /firefox\.test\.ts$/
const WEBKIT_SPEC = /webkit\.test\.ts$/
const ENGINE_SPECS = [NO_WEBRTC_SPEC, FIREFOX_SPEC, WEBKIT_SPEC]

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1, // Run tests serially to avoid WebRTC port conflicts
  // Nothing here depends on a public service: the app talks to the repo's own
  // PeerJS server (bin/peerjs.js, port 9000) instead of 0.peerjs.com.
  webServer: [
    {
      command: 'node bin/peerjs.js',
      url: 'http://localhost:9000/peerjs/filepizza/',
      timeout: 60 * 1000,
      reuseExistingServer: true,
    },
    {
      command: 'node .output/server/index.mjs',
      url: 'http://localhost:3000',
      timeout: 120 * 1000,
      reuseExistingServer: true,
      env: {
        PEERJS_HOST: 'localhost',
        PEERJS_PORT: '9000',
        PEERJS_PATH: '/peerjs/filepizza/',
      },
    },
  ],
  use: {
    baseURL: 'http://localhost:3000',
  },
  // Every spec runs in each engine. Run one with `pnpm test:e2e --project=webkit`.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ENGINE_SPECS,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: ENGINE_SPECS,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: ENGINE_SPECS,
    },
    {
      name: 'firefox-specific',
      testMatch: FIREFOX_SPEC,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-specific',
      testMatch: WEBKIT_SPEC,
      use: { ...devices['Desktop Safari'] },
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
