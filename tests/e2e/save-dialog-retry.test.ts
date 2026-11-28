import { test, expect } from './fixtures'
import { createBrowserContexts, selectFile, startUpload } from './helpers'

// Big enough that the browser has already read part of the stream when it
// drops the request.
const CONTENT = 'a slice of pizza\n'.repeat(400_000)

// Some browsers (and download managers) request a download, drop that request
// while they ask where to save the file, and request the same URL again once
// it is confirmed (#272). The second request must get the whole file.
test('a download whose first request was dropped can be requested again', async ({
  browser,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'Safari saves through a Blob, not the service worker',
  )
  const { uploaderPage, downloaderPage, cleanup } =
    await createBrowserContexts(browser)
  try {
    // Keep the page's hidden iframe from starting the download itself, so the
    // test can request the URL the way a browser would.
    await downloaderPage.addInitScript(() => {
      const append = Node.prototype.appendChild
      Node.prototype.appendChild = function <T extends Node>(node: T): T {
        if (
          node instanceof HTMLIFrameElement &&
          !node.src.endsWith('/stream.html')
        ) {
          ;(window as unknown as { downloadUrl: string }).downloadUrl = node.src
          return node
        }
        return append.call(this, node) as T
      }
    })

    await selectFile(uploaderPage, 'retry.txt', CONTENT)
    const shareUrl = await startUpload(uploaderPage)
    await downloaderPage.goto(shareUrl)
    await expect(downloaderPage.locator('#download-button')).toBeVisible({
      timeout: 15000,
    })
    await downloaderPage.locator('#download-button').click()
    await downloaderPage.waitForFunction(
      () => 'downloadUrl' in window,
      undefined,
      { timeout: 15000 },
    )

    const result = await downloaderPage.evaluate(async () => {
      const url = (window as unknown as { downloadUrl: string }).downloadUrl
      // First request: take the headers, give the browser time to read ahead,
      // then drop it without using the body.
      const dropped = new AbortController()
      const first = await fetch(url, { signal: dropped.signal })
      await new Promise((resolve) => setTimeout(resolve, 300))
      dropped.abort()
      // Second request for the same URL.
      const second = await fetch(url)
      return {
        firstStatus: first.status,
        status: second.status,
        text: await second.text(),
      }
    })
    expect(result.firstStatus).toBe(200)
    expect(result.status).toBe(200)
    expect(result.text.length).toBe(CONTENT.length)
    expect(result.text === CONTENT).toBe(true)
    await expect(downloaderPage.getByText(/You downloaded/i)).toBeVisible()
  } finally {
    await cleanup()
  }
})
