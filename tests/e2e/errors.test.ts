import { test, expect, type Browser } from '@playwright/test'
import {
  createBrowserContexts,
  disableWebRTC,
  selectFile,
  stallDataChannel,
  startUpload,
} from './helpers'

// The same scenarios run in Chromium, Firefox and WebKit (see the projects in
// playwright.config.ts).

const WEBRTC_UNAVAILABLE = /WebRTC is disabled or not supported/
// Peers notice a closed page through the browser and the signalling server,
// which can take a few seconds.
const DISCONNECT_TIMEOUT = 30_000

test.describe('WebRTC unavailable', () => {
  test('an uploader is told to enable WebRTC', async ({ page }) => {
    await disableWebRTC(page)
    await selectFile(page, 'hello.txt', 'hello')
    await page.locator('#start-button').click()

    await expect(page.getByRole('alert')).toHaveText(WEBRTC_UNAVAILABLE)
    await expect(page.getByText('Initializing WebRTC peer...')).toHaveCount(0)
    await expect(page.locator('#copyable-input-long-url')).toHaveCount(0)
  })

  test('a downloader is told to enable WebRTC', async ({ browser }) => {
    const { uploaderPage, downloaderPage, cleanup } =
      await createBrowserContexts(browser)
    try {
      await selectFile(uploaderPage, 'hello.txt', 'hello')
      const shareUrl = await startUpload(uploaderPage)

      await disableWebRTC(downloaderPage)
      await downloaderPage.goto(shareUrl)

      await expect(downloaderPage.getByRole('alert')).toHaveText(
        WEBRTC_UNAVAILABLE,
      )
      await expect(downloaderPage.locator('#download-button')).toHaveCount(0)
    } finally {
      await cleanup()
    }
  })
})

test('an unreachable signalling server is reported instead of hanging', async ({
  page,
}) => {
  await page.route(/\/peerjs\/id\?/, (route) => route.abort())
  await selectFile(page, 'hello.txt', 'hello')
  await page.locator('#start-button').click()

  await expect(page.getByRole('alert')).toContainText(
    'Could not connect to the signalling server',
  )
  await expect(page.getByText('Initializing WebRTC peer...')).toHaveCount(0)
})

test('an unknown share link shows the missing-slice page', async ({ page }) => {
  const response = await page.goto('/download/no/such/slice')

  expect(response?.status()).toBe(404)
  await expect(
    page.getByText(/this slice of FilePizza got eaten/),
  ).toBeVisible()
  await page.getByRole('link', { name: /serve up a fresh slice/i }).click()
  await expect(page).toHaveURL('/')
})

test('a link whose uploader has left says so', async ({ browser }) => {
  const { uploaderPage, downloaderPage, cleanup } =
    await createBrowserContexts(browser)
  try {
    await selectFile(uploaderPage, 'hello.txt', 'hello')
    const shareUrl = await startUpload(uploaderPage)
    await uploaderPage.close()

    await downloaderPage.goto(shareUrl)
    await expect(downloaderPage.getByRole('alert')).toContainText(
      'Could not connect to the uploader',
      { timeout: DISCONNECT_TIMEOUT },
    )
    await expect(downloaderPage.locator('#download-button')).toHaveCount(0)
  } finally {
    await cleanup()
  }
})

test('a wrong password is rejected and the right one unlocks the download', async ({
  browser,
}) => {
  const { uploaderPage, downloaderPage, cleanup } =
    await createBrowserContexts(browser)
  try {
    await selectFile(uploaderPage, 'secret.txt', 'top secret')
    await uploaderPage.locator('input[type="password"]').fill('pepperoni')
    const shareUrl = await startUpload(uploaderPage)

    await downloaderPage.goto(shareUrl)
    await expect(
      downloaderPage.getByText('This download requires a password.'),
    ).toBeVisible()

    await downloaderPage.locator('input[type="password"]').fill('anchovies')
    await downloaderPage.getByRole('button', { name: /unlock/i }).click()
    await expect(downloaderPage.getByRole('alert')).toHaveText(
      'Invalid password',
    )
    await expect(downloaderPage.locator('#download-button')).toHaveCount(0)

    await downloaderPage.locator('input[type="password"]').fill('pepperoni')
    await downloaderPage.getByRole('button', { name: /unlock/i }).click()
    await expect(downloaderPage.locator('#download-button')).toBeVisible()
  } finally {
    await cleanup()
  }
})

const UPLOADER_LEFT = /uploader stopped sharing or lost their connection/

test.describe('disconnects in the middle of a transfer', () => {
  // One chunk is 256 KiB, so the data channel goes quiet partway through the
  // second chunk of a four-chunk file. The transfer is then stuck mid-way and
  // the test ends it from one side with the app's own stop button, which closes
  // the connection cleanly in every browser.
  const STALL_AFTER_BYTES = 300_000
  const FILE = Buffer.alloc(1024 * 1024, 'x')

  async function startStalledDownload(browser: Browser) {
    const pages = await createBrowserContexts(browser)
    const { uploaderPage, downloaderPage } = pages
    await stallDataChannel(uploaderPage, STALL_AFTER_BYTES)
    await selectFile(uploaderPage, 'big.bin', FILE)
    const shareUrl = await startUpload(uploaderPage)

    await downloaderPage.goto(shareUrl)
    const firstChunk = downloaderPage.waitForEvent('console', (message) =>
      /\[Downloader\] received chunk 1 /.test(message.text()),
    )
    await downloaderPage.locator('#download-button').click()
    await firstChunk
    await expect(
      uploaderPage.getByText('UPLOADING', { exact: true }),
    ).toBeVisible()
    return pages
  }

  test('a downloader is told when the uploader stops sharing', async ({
    browser,
  }) => {
    const { uploaderPage, downloaderPage, cleanup } =
      await startStalledDownload(browser)
    try {
      await uploaderPage.getByRole('button', { name: /stop upload/i }).click()

      await expect(downloaderPage.getByRole('alert')).toHaveText(
        UPLOADER_LEFT,
        { timeout: DISCONNECT_TIMEOUT },
      )
      await expect(downloaderPage.getByText(/You downloaded/i)).toHaveCount(0)
      // No dead Download button is left behind.
      await expect(downloaderPage.locator('#download-button')).toHaveCount(0)
      await expect(
        downloaderPage.getByRole('link', { name: /serve up a fresh slice/i }),
      ).toBeVisible()
    } finally {
      await cleanup()
    }
  })

  test('stopping a download is acknowledged and closes it for the uploader', async ({
    browser,
  }) => {
    const { uploaderPage, downloaderPage, cleanup } =
      await startStalledDownload(browser)
    try {
      await downloaderPage
        .getByRole('button', { name: /stop download/i })
        .click()

      await expect(
        downloaderPage.getByText('You stopped this download.'),
      ).toBeVisible()
      await expect(downloaderPage.getByRole('alert')).toHaveCount(0)
      await expect(downloaderPage.locator('#download-button')).toHaveCount(0)
      await expect(
        uploaderPage.getByText('CLOSED', { exact: true }),
      ).toBeVisible({ timeout: DISCONNECT_TIMEOUT })
      await expect(uploaderPage.getByText('DONE', { exact: true })).toHaveCount(
        0,
      )
    } finally {
      await cleanup()
    }
  })
})

test.describe('a peer that vanishes without saying goodbye', () => {
  // A killed tab sends nothing, so the other side only learns from ICE failing,
  // which takes about 15 seconds in Chromium and longer in some engines.
  test.setTimeout(120_000)
  const ICE_TIMEOUT = 90_000

  test('a downloader is told when the uploader disappears', async ({
    browser,
  }) => {
    const { uploaderPage, downloaderPage, cleanup } =
      await createBrowserContexts(browser)
    try {
      await selectFile(uploaderPage, 'hello.txt', 'hello')
      const shareUrl = await startUpload(uploaderPage)
      await downloaderPage.goto(shareUrl)
      await expect(downloaderPage.locator('#download-button')).toBeVisible()

      await uploaderPage.close()

      await expect(downloaderPage.getByRole('alert')).toHaveText(
        UPLOADER_LEFT,
        { timeout: ICE_TIMEOUT },
      )
      await expect(downloaderPage.locator('#download-button')).toHaveCount(0)
    } finally {
      await cleanup()
    }
  })

  test('an uploader marks a downloader as closed when it disappears', async ({
    browser,
  }) => {
    const { uploaderPage, downloaderPage, cleanup } =
      await createBrowserContexts(browser)
    try {
      await selectFile(uploaderPage, 'hello.txt', 'hello')
      const shareUrl = await startUpload(uploaderPage)
      await downloaderPage.goto(shareUrl)
      await expect(downloaderPage.locator('#download-button')).toBeVisible()
      await expect(
        uploaderPage.getByText('READY', { exact: true }),
      ).toBeVisible()

      await downloaderPage.close()

      await expect(
        uploaderPage.getByText('CLOSED', { exact: true }),
      ).toBeVisible({ timeout: ICE_TIMEOUT })
    } finally {
      await cleanup()
    }
  })
})
