/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test'
import { createBrowserContexts, selectFile, startUpload } from './helpers'
import { readFileSync } from 'fs'

test.describe('WebKit', () => {
  test.skip(({ browserName }) => browserName !== 'webkit', 'WebKit only')

  // Safari can't save a download that comes from a service worker, so the app
  // buffers the file and saves it as a Blob instead.
  test('saves downloads through the Blob fallback, not the service worker', async ({
    browser,
  }, testInfo) => {
    const { uploaderPage, downloaderPage, cleanup } =
      await createBrowserContexts(browser)
    try {
      const content = 'x'.repeat(600_000) // a few chunks
      await selectFile(uploaderPage, 'webkit.txt', content)
      const shareUrl = await startUpload(uploaderPage)

      await downloaderPage.goto(shareUrl)
      const downloadPromise = downloaderPage.waitForEvent('download')
      await downloaderPage.locator('#download-button').click()
      const download = await downloadPromise
      const path = testInfo.outputPath('downloaded.txt')
      await download.saveAs(path)

      expect(download.suggestedFilename()).toBe('webkit.txt')
      expect(readFileSync(path, 'utf8')).toBe(content)
      await expect(downloaderPage.getByText(/You downloaded/i)).toBeVisible()
      expect(
        await downloaderPage.evaluate(
          async () => (await navigator.serviceWorker.getRegistrations()).length,
        ),
      ).toBe(0)
    } finally {
      await cleanup()
    }
  })
})
