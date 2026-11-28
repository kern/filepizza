/// <reference types="@playwright/test" />
import { test, expect, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'fs'
import { createBrowserContexts, selectFile, startUpload } from './helpers'

const CONTENT = 'a slice of pizza\n'.repeat(1000)

async function download(page: Page, url: string, savePath: string) {
  await page.goto(url)
  await expect(page.locator('#download-button')).toBeVisible({
    timeout: 15000,
  })
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#download-button').click()
  const file = await downloadPromise
  await file.saveAs(savePath)
  return {
    name: file.suggestedFilename(),
    content: readFileSync(savePath, 'utf8'),
  }
}

async function newPage(browser: Browser) {
  const context = await browser.newContext()
  return { page: await context.newPage(), close: () => context.close() }
}

test.describe('share links', () => {
  test('offers a short and a long link that both lead to the file', async ({
    browser,
  }, testInfo) => {
    const { uploaderPage, cleanup } = await createBrowserContexts(browser)
    const first = await newPage(browser)
    const second = await newPage(browser)
    try {
      await selectFile(uploaderPage, 'codes.txt', CONTENT)
      await startUpload(uploaderPage)

      const longUrl = await uploaderPage
        .locator('#copyable-input-long-url')
        .inputValue()
      const shortUrl = await uploaderPage
        .locator('#copyable-input-short-url')
        .inputValue()

      // A short code is eight characters; the long one is four toppings.
      expect(shortUrl).toMatch(/\/download\/[a-z0-9]{8}$/)
      expect(longUrl).toMatch(/\/download\/[a-z]+\/[a-z]+\/[a-z]+\/[a-z]+$/)
      expect(shortUrl).not.toBe(longUrl)
      await expect(uploaderPage.locator('svg').first()).toBeVisible() // QR code

      const viaShort = await download(
        first.page,
        shortUrl,
        testInfo.outputPath('short.txt'),
      )
      const viaLong = await download(
        second.page,
        longUrl,
        testInfo.outputPath('long.txt'),
      )
      for (const result of [viaShort, viaLong]) {
        expect(result.name).toBe('codes.txt')
        expect(result.content).toBe(CONTENT)
      }
    } finally {
      await first.close()
      await second.close()
      await cleanup()
    }
  })

  test('each upload gets its own codes', async ({ browser }) => {
    const first = await newPage(browser)
    const second = await newPage(browser)
    try {
      const urls: string[][] = []
      for (const { page } of [first, second]) {
        await selectFile(page, 'same-name.txt', 'same content')
        await startUpload(page)
        urls.push([
          await page.locator('#copyable-input-short-url').inputValue(),
          await page.locator('#copyable-input-long-url').inputValue(),
        ])
      }
      expect(urls[0][0]).not.toBe(urls[1][0])
      expect(urls[0][1]).not.toBe(urls[1][1])
    } finally {
      await first.close()
      await second.close()
    }
  })

  test('copying a link says it was copied', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await selectFile(page, 'copy.txt', 'copy me')
      await startUpload(page)
      const copy = page.getByRole('button', { name: 'Copy' }).first()
      await copy.click()
      await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
    } finally {
      await context.close()
    }
  })
})

test.describe('several downloaders', () => {
  test('one upload serves many downloaders at the same time', async ({
    browser,
  }, testInfo) => {
    const { uploaderPage, cleanup } = await createBrowserContexts(browser)
    const downloaders = await Promise.all([1, 2, 3].map(() => newPage(browser)))
    try {
      await selectFile(uploaderPage, 'shared.txt', CONTENT)
      const shareUrl = await startUpload(uploaderPage)

      // All three connect before anyone downloads, then download together.
      await Promise.all(downloaders.map(({ page }) => page.goto(shareUrl)))
      for (const { page } of downloaders) {
        await expect(page.locator('#download-button')).toBeVisible({
          timeout: 15000,
        })
      }
      await expect(
        uploaderPage.getByText('READY', { exact: true }),
      ).toHaveCount(3)

      const results = await Promise.all(
        downloaders.map(async ({ page }, i) => {
          const downloadPromise = page.waitForEvent('download')
          await page.locator('#download-button').click()
          const file = await downloadPromise
          const path = testInfo.outputPath(`downloaded-${i}.txt`)
          await file.saveAs(path)
          return readFileSync(path, 'utf8')
        }),
      )
      for (const content of results) expect(content).toBe(CONTENT)

      for (const { page } of downloaders) {
        await expect(page.getByText(/You downloaded/i)).toBeVisible()
      }
      await expect(uploaderPage.getByText('DONE', { exact: true })).toHaveCount(
        3,
      )
      await expect(
        uploaderPage.getByText('Completed: 1 / 1 files'),
      ).toHaveCount(3)
    } finally {
      await Promise.all(downloaders.map(({ close }) => close()))
      await cleanup()
    }
  })

  test('a downloader can arrive after others have finished', async ({
    browser,
  }, testInfo) => {
    const { uploaderPage, cleanup } = await createBrowserContexts(browser)
    const early = await newPage(browser)
    const late = await newPage(browser)
    try {
      await selectFile(uploaderPage, 'again.txt', CONTENT)
      const shareUrl = await startUpload(uploaderPage)

      const first = await download(
        early.page,
        shareUrl,
        testInfo.outputPath('1.txt'),
      )
      await expect(uploaderPage.getByText('DONE', { exact: true })).toHaveCount(
        1,
      )
      const second = await download(
        late.page,
        shareUrl,
        testInfo.outputPath('2.txt'),
      )

      expect(first.content).toBe(CONTENT)
      expect(second.content).toBe(CONTENT)
      await expect(uploaderPage.getByText('DONE', { exact: true })).toHaveCount(
        2,
      )
    } finally {
      await early.close()
      await late.close()
      await cleanup()
    }
  })

  test("one downloader leaving doesn't disturb another", async ({
    browser,
  }, testInfo) => {
    const { uploaderPage, cleanup } = await createBrowserContexts(browser)
    const leaver = await newPage(browser)
    const stayer = await newPage(browser)
    try {
      await selectFile(uploaderPage, 'steady.txt', CONTENT)
      const shareUrl = await startUpload(uploaderPage)

      await leaver.page.goto(shareUrl)
      await expect(leaver.page.locator('#download-button')).toBeVisible({
        timeout: 15000,
      })
      await stayer.page.goto(shareUrl)
      await expect(stayer.page.locator('#download-button')).toBeVisible({
        timeout: 15000,
      })

      // The first downloader stops and goes away...
      await leaver.close()
      // ...and the second still gets the whole file.
      const downloadPromise = stayer.page.waitForEvent('download')
      await stayer.page.locator('#download-button').click()
      const file = await downloadPromise
      const path = testInfo.outputPath('steady.txt')
      await file.saveAs(path)
      expect(readFileSync(path, 'utf8')).toBe(CONTENT)
      await expect(stayer.page.getByText(/You downloaded/i)).toBeVisible()
    } finally {
      await stayer.close()
      await cleanup()
    }
  })
})
