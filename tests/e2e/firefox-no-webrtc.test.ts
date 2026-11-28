/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test'
import { selectFile } from './helpers'

// Runs only in the `firefox-no-webrtc` project (see playwright.config.ts),
// which launches Firefox with `media.peerconnection.enabled` set to false:
// the real switch from the bug report (#288), not a script that fakes it.

test('the upload page explains how to turn WebRTC back on', async ({
  page,
}) => {
  expect(await page.evaluate(() => typeof window.RTCPeerConnection)).toBe(
    'undefined',
  )

  await selectFile(page, 'hello.txt', 'hello')
  await page.locator('#start-button').click()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('WebRTC is disabled or not supported')
  await expect(alert).toContainText('media.peerconnection.enabled')
  await expect(page.getByText('Initializing WebRTC peer...')).toHaveCount(0)
})
