import { test, expect } from './fixtures'
import { readFileSync } from 'fs'
import { createBrowserContexts, selectFile, startUpload } from './helpers'

test.describe('the upload page', () => {
  test('explains the terms before uploading', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'View upload terms' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    // Either the dialog closes on Escape or through its own close button.
    if (await dialog.isVisible()) {
      await dialog
        .getByRole('button', { name: /close|ok|got it|agree/i })
        .first()
        .click()
    }
    await expect(dialog).toBeHidden()
  })

  test('lets you remove files, add more, and cancel', async ({ page }) => {
    await selectFile(page, 'one.txt', 'one')
    await expect(page.getByText(/start uploading 1 file/)).toBeVisible()

    await page.locator('#add-files-input').setInputFiles({
      name: 'two.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('two'),
    })
    await expect(page.getByText(/start uploading 2 files/)).toBeVisible()
    await expect(page.getByText('two.txt')).toBeVisible()

    await page.getByRole('button', { name: '✕' }).nth(1).click()
    await expect(page.getByText('two.txt')).toHaveCount(0)
    await expect(page.getByText(/start uploading 1 file/)).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('#drop-zone-button')).toBeVisible()
    await expect(page.getByText('one.txt')).toHaveCount(0)
  })

  test('shows what is being shared while it is shared', async ({ page }) => {
    await selectFile(page, 'pizza.txt', 'dough')
    await startUpload(page)

    await expect(page.getByText(/You are uploading 1 file/)).toBeVisible()
    await expect(
      page.getByText('Leave this tab open. FilePizza does not store files.'),
    ).toBeVisible()
    await expect(page.getByText('pizza.txt')).toBeVisible()
    await expect(page.getByText('0 Downloading, 0 Total')).toBeVisible()
  })

  test('can stop sharing and start again with a new link', async ({
    browser,
  }, testInfo) => {
    const { uploaderPage, downloaderPage, cleanup } =
      await createBrowserContexts(browser)
    try {
      await selectFile(uploaderPage, 'again.txt', 'second time lucky')
      const firstUrl = await startUpload(uploaderPage)

      await uploaderPage.getByRole('button', { name: /stop upload/i }).click()
      // Back at the confirmation page with the file still selected.
      await expect(
        uploaderPage.getByText(/You are about to start uploading 1 file/),
      ).toBeVisible()
      await expect(uploaderPage.getByText('again.txt')).toBeVisible()

      const secondUrl = await startUpload(uploaderPage)
      expect(secondUrl).not.toBe(firstUrl)

      await downloaderPage.goto(secondUrl)
      const downloadPromise = downloaderPage.waitForEvent('download')
      await downloaderPage.locator('#download-button').click()
      const file = await downloadPromise
      const path = testInfo.outputPath('again.txt')
      await file.saveAs(path)
      expect(readFileSync(path, 'utf8')).toBe('second time lucky')
    } finally {
      await cleanup()
    }
  })
})

test.describe('the download page', () => {
  test('lists every file before downloading and zips several together', async ({
    browser,
  }, testInfo) => {
    const { uploaderPage, downloaderPage, cleanup } =
      await createBrowserContexts(browser)
    try {
      await uploaderPage.goto('/')
      await uploaderPage.locator('input[type="file"]').setInputFiles([
        { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('aaa') },
        { name: 'b.txt', mimeType: 'text/plain', buffer: Buffer.from('bbb') },
      ])
      const shareUrl = await startUpload(uploaderPage)

      await downloaderPage.goto(shareUrl)
      await expect(
        downloaderPage.getByText(/start downloading 2 files/),
      ).toBeVisible({ timeout: 15000 })
      await expect(downloaderPage.getByText('a.txt')).toBeVisible()
      await expect(downloaderPage.getByText('b.txt')).toBeVisible()

      const downloadPromise = downloaderPage.waitForEvent('download')
      await downloaderPage.locator('#download-button').click()
      const file = await downloadPromise
      expect(file.suggestedFilename()).toMatch(/\.zip$/)
      const path = testInfo.outputPath('files.zip')
      await file.saveAs(path)
      const zip = readFileSync(path)
      expect(zip.includes(Buffer.from('aaa'))).toBe(true)
      expect(zip.includes(Buffer.from('bbb'))).toBe(true)
      await expect(
        downloaderPage.getByText(/You downloaded 2 files/),
      ).toBeVisible()
    } finally {
      await cleanup()
    }
  })

  test('reporting a delivery halts it for everyone', async ({ browser }) => {
    const { uploaderPage, downloaderPage, cleanup } =
      await createBrowserContexts(browser)
    const bystander = await browser.newContext()
    try {
      await selectFile(uploaderPage, 'suspicious.txt', 'pineapple')
      const shareUrl = await startUpload(uploaderPage)

      await downloaderPage.goto(shareUrl)
      const other = await bystander.newPage()
      await other.goto(shareUrl)
      await expect(other.locator('#download-button')).toBeVisible({
        timeout: 15000,
      })

      await downloaderPage
        .getByRole('button', { name: 'Report terms violation' })
        .click()
      await downloaderPage
        .getByRole('button', { name: 'Confirm report' })
        .click()

      for (const page of [downloaderPage, uploaderPage, other]) {
        await expect(page).toHaveURL(/\/reported$/, { timeout: 15000 })
        await expect(
          page.getByText('This delivery has been halted.'),
        ).toBeVisible()
      }

      // The link is dead afterwards.
      const response = await downloaderPage.goto(shareUrl)
      expect(response?.status()).toBe(404)
    } finally {
      await bystander.close()
      await cleanup()
    }
  })
})

test('the reported page links back home', async ({ page }) => {
  await page.goto('/reported')
  await expect(page.getByText('This delivery has been halted.')).toBeVisible()
  await page.getByRole('link', { name: /serve up a fresh slice/i }).click()
  await expect(page).toHaveURL('/')
})

test.describe('appearance', () => {
  test('the theme toggle switches and remembers dark mode', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.getByRole('button', { name: 'Toggle mode' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // The choice survives a reload, without waiting for hydration.
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.getByRole('button', { name: 'Toggle mode' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('follows the system theme until a choice is made', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
