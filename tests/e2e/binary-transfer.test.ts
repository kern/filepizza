import { test, expect, Page } from '@playwright/test'
import { createHash, randomBytes } from 'crypto'
import { writeFileSync, readFileSync } from 'fs'
import { startUpload, createBrowserContexts } from './helpers'

// Random content makes every chunk unique, so reordered, repeated or missing
// chunks change the result. Files filled with a single character cannot show
// a reordering.
const CHUNK_SIZE = 256 * 1024

// Records the highest percentage the uploader page ever displays.
async function trackMaxPercentage(page: Page): Promise<() => Promise<number>> {
  await page.evaluate(() => {
    const win = window as unknown as { maxPercentage: number }
    win.maxPercentage = 0
    new MutationObserver(() => {
      for (const match of document.body.innerText.matchAll(/(\d+)%/g)) {
        win.maxPercentage = Math.max(win.maxPercentage, Number(match[1]))
      }
    }).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    })
  })
  return () =>
    page.evaluate(
      () => (window as unknown as { maxPercentage: number }).maxPercentage,
    )
}

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex')

const testCases = [
  { name: 'single file', sizes: [CHUNK_SIZE * 20 + 123] },
  { name: 'multiple files', sizes: [CHUNK_SIZE * 4, 1000] },
]

for (const testCase of testCases) {
  test(`binary transfer: ${testCase.name}`, async ({ browser }, testInfo) => {
    const files = testCase.sizes.map((size, i) => {
      const name = `random-${i}.bin`
      const path = testInfo.outputPath(name)
      const data = randomBytes(size)
      writeFileSync(path, data)
      return { name, path, data }
    })

    const { uploaderPage, downloaderPage, cleanup } =
      await createBrowserContexts(browser)

    try {
      await uploaderPage.goto('/')
      await expect(uploaderPage.locator('#drop-zone-button')).toBeVisible()
      await uploaderPage
        .locator('input[type="file"]')
        .setInputFiles(files.map((f) => f.path))
      const shareUrl = await startUpload(uploaderPage)
      const maxPercentage = await trackMaxPercentage(uploaderPage)

      await downloaderPage.goto(shareUrl)
      const downloadPromise = downloaderPage.waitForEvent('download')
      await downloaderPage.locator('#download-button').click()
      const download = await downloadPromise
      const downloadPath = testInfo.outputPath('downloaded')
      await download.saveAs(downloadPath)
      const downloaded = readFileSync(downloadPath)

      if (files.length === 1) {
        expect(sha256(downloaded)).toBe(sha256(files[0].data))
      } else {
        // The zip stores files uncompressed, so each appears verbatim.
        for (const file of files) {
          expect(downloaded.includes(file.data), file.name).toBe(true)
        }
      }

      await expect(
        uploaderPage.getByText('DONE', { exact: true }),
      ).toBeVisible()
      await expect(
        uploaderPage.getByText(
          `Completed: ${files.length} / ${files.length} files`,
        ),
      ).toBeVisible()
      expect(await maxPercentage()).toBe(100)
    } finally {
      await cleanup()
    }
  })
}
