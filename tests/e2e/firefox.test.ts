/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test'
import { createBrowserContexts, selectFile, startUpload } from './helpers'
import { readFileSync } from 'fs'

test.describe('Firefox', () => {
  test.skip(({ browserName }) => browserName !== 'firefox', 'Firefox only')

  test('streams a download through the service worker', async ({
    browser,
  }, testInfo) => {
    const { uploaderPage, downloaderPage, cleanup } =
      await createBrowserContexts(browser)
    try {
      await selectFile(uploaderPage, 'firefox.txt', 'served by a worker')
      const shareUrl = await startUpload(uploaderPage)

      await downloaderPage.goto(shareUrl)
      const downloadPromise = downloaderPage.waitForEvent('download')
      await downloaderPage.locator('#download-button').click()
      const download = await downloadPromise
      const path = testInfo.outputPath('downloaded.txt')
      await download.saveAs(path)

      expect(download.suggestedFilename()).toBe('firefox.txt')
      expect(readFileSync(path, 'utf8')).toBe('served by a worker')
      // Firefox can stream downloads, so the worker is registered.
      expect(
        await downloaderPage.evaluate(
          async () => (await navigator.serviceWorker.getRegistrations()).length,
        ),
      ).toBeGreaterThan(0)
    } finally {
      await cleanup()
    }
  })
})
