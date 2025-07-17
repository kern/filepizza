import { Page, Browser, expect } from '@playwright/test'
import { createHash } from 'crypto'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export interface TestFile {
  name: string
  content: string
  path: string
  checksum: string
}

export function createTestFile(fileName: string, content: string): TestFile {
  const testFilePath = join(tmpdir(), fileName)
  writeFileSync(testFilePath, content)

  const checksum = createHash('sha256').update(content).digest('hex')

  return {
    name: fileName,
    content,
    path: testFilePath,
    checksum,
  }
}

export async function uploadFile(
  page: Page,
  testFile: TestFile,
): Promise<void> {
  // Navigate to home page
  await page.goto('http://localhost:3000/')
  await expect(
    page.getByText('Peer-to-peer file transfers in your browser.'),
  ).toBeVisible()

  // Wait for drop zone button to be ready
  await expect(page.locator('#drop-zone-button')).toBeVisible()

  // Upload file using the file input and trigger change event
  await page.evaluate(
    ({ testContent, testFileName }) => {
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement
      if (input) {
        const file = new File([testContent], testFileName, {
          type: 'text/plain',
        })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files

        // Manually trigger the change event
        const event = new Event('change', { bubbles: true })
        input.dispatchEvent(event)
      }
    },
    { testContent: testFile.content, testFileName: testFile.name },
  )

  // Wait for file to be processed and confirm upload page to appear
  await expect(page.getByText(/You are about to start uploading/i)).toBeVisible(
    { timeout: 10000 },
  )
}

export async function addFile(
  page: Page,
  testFile: TestFile,
): Promise<void> {
  await page.evaluate(
    ({ testContent, testFileName }) => {
      const input = document.querySelector(
        '#add-files-input',
      ) as HTMLInputElement
      if (input) {
        const file = new File([testContent], testFileName, {
          type: 'text/plain',
        })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files

        const event = new Event('change', { bubbles: true })
        input.dispatchEvent(event)
      }
    },
    { testContent: testFile.content, testFileName: testFile.name },
  )

  await expect(page.getByText(testFile.name)).toBeVisible({ timeout: 5000 })
}

export async function startUpload(page: Page): Promise<string> {
  // Start sharing
  await page.locator('#start-button').click()

  // Wait for uploading state and get the share URL
  await expect(page.getByText(/You are uploading/i)).toBeVisible({
    timeout: 10000,
  })

  // Get the share URL from the copyable input (Long URL)
  const shareUrlInput = page.locator('#copyable-input-long-url')
  await expect(shareUrlInput).toBeVisible({ timeout: 5000 })
  const shareUrl = await shareUrlInput.inputValue()

  expect(shareUrl).toMatch(/http:\/\/localhost:3000\//)
  return shareUrl
}

export async function downloadFile(
  page: Page,
  shareUrl: string,
  testFile: TestFile,
): Promise<string> {
  // Navigate to share URL
  await page.goto(shareUrl)

  // Wait for download page to load
  await expect(page.getByText(testFile.name)).toBeVisible({
    timeout: 10000,
  })

  // Start download
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#download-button').click()
  const download = await downloadPromise

  // Verify download
  expect(download.suggestedFilename()).toBe(testFile.name)

  // Save downloaded file
  const downloadPath = join(tmpdir(), `downloaded-${testFile.name}`)
  await download.saveAs(downloadPath)

  return downloadPath
}

export async function verifyFileIntegrity(
  downloadPath: string,
  testFile: TestFile,
): Promise<void> {
  // Verify downloaded content and checksum
  const downloadedContent = readFileSync(downloadPath, 'utf8')
  expect(downloadedContent).toBe(testFile.content)

  const downloadedChecksum = createHash('sha256')
    .update(downloadedContent)
    .digest('hex')
  expect(downloadedChecksum).toBe(testFile.checksum)
}

export async function verifyTransferCompletion(
  downloaderPage: Page,
): Promise<void> {
  // Verify download completion on downloader side
  await expect(downloaderPage.getByText(/You downloaded/i)).toBeVisible({
    timeout: 10000,
  })
}

export async function createBrowserContexts(browser: Browser): Promise<{
  uploaderPage: Page
  downloaderPage: Page
  cleanup: () => Promise<void>
}> {
  const uploaderContext = await browser.newContext()
  const downloaderContext = await browser.newContext()

  const uploaderPage = await uploaderContext.newPage()
  const downloaderPage = await downloaderContext.newPage()

  const cleanup = async () => {
    await uploaderContext.close()
    await downloaderContext.close()
  }

  return { uploaderPage, downloaderPage, cleanup }
}

export interface ProgressMonitor {
  uploaderProgress: number
  downloaderProgress: number
  maxProgress: number
}

export interface ChunkProgressLog {
  chunkNumber: number
  fileName: string
  offset: number
  end: number
  fileSize: number
  final: boolean
  progressPercentage: number
  side: 'upload' | 'download'
}

export interface PreciseChunkMonitor {
  uploadChunks: ChunkProgressLog[]
  downloadChunks: ChunkProgressLog[]
}

export async function monitorChunkProgress(
  uploaderPage: Page,
  downloaderPage: Page,
  expectedFileSize: number,
): Promise<PreciseChunkMonitor> {
  const uploadChunks: ChunkProgressLog[] = []
  const downloadChunks: ChunkProgressLog[] = []

  uploaderPage.on('console', async (msg) => {
    const text = msg.text()
    if (text.includes('[UploaderConnections] received chunk ack')) {
      // Parse ack log: "[UploaderConnections] received chunk ack: file.txt offset 0 bytes 262144"
      const ackMatch = text.match(
        /received chunk ack: (\S+) offset (\d+) bytes (\d+)/,
      )
      if (ackMatch) {
        const [, fileName, offset, bytes] = ackMatch

        // Calculate which chunk this corresponds to and expected progress
        const chunkNumber = Math.floor(parseInt(offset) / (256 * 1024)) + 1
        const chunkEnd = parseInt(offset) + parseInt(bytes)
        const final = chunkEnd >= expectedFileSize
        const progressPercentage = Math.round(
          (chunkEnd / expectedFileSize) * 100,
        )

        uploadChunks.push({
          chunkNumber,
          fileName,
          offset: parseInt(offset),
          end: chunkEnd,
          fileSize: expectedFileSize,
          final,
          progressPercentage,
          side: 'upload',
        })
      }
    }
  })

  downloaderPage.on('console', async (msg) => {
    const text = msg.text()
    if (
      text.includes('[Downloader] received chunk') &&
      !text.includes('finished receiving')
    ) {
      // Parse log: "[Downloader] received chunk 1 for file.txt (0-262144) final=false"
      const chunkMatch = text.match(
        /received chunk (\d+) for (\S+) \((\d+)-(\d+)\) final=(\w+)/,
      )
      if (chunkMatch) {
        const [, chunkNum, fileName, offset, end, final] = chunkMatch

        // Calculate expected progress based on chunk data
        const chunkEnd = parseInt(end)
        const progressPercentage = Math.round(
          (chunkEnd / expectedFileSize) * 100,
        )

        downloadChunks.push({
          chunkNumber: parseInt(chunkNum),
          fileName,
          offset: parseInt(offset),
          end: chunkEnd,
          fileSize: expectedFileSize,
          final: final === 'true',
          progressPercentage,
          side: 'download',
        })
      }
    }
  })

  return {
    uploadChunks,
    downloadChunks,
  }
}

export function verifyPreciseProgress(
  chunks: ChunkProgressLog[],
  expectedChunks: number,
  side: 'upload' | 'download',
): void {
  expect(chunks.length).toBe(expectedChunks)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    console.log(
      `${side} chunk ${chunk.chunkNumber}: ${chunk.offset}-${chunk.end}/${chunk.fileSize} ` +
        `progress=${chunk.progressPercentage}% final=${chunk.final}`,
    )

    // Verify chunks are received in order
    expect(chunk.chunkNumber).toBe(i + 1)

    // Verify progress is monotonically increasing
    if (i > 0) {
      expect(chunk.progressPercentage).toBeGreaterThanOrEqual(
        chunks[i - 1].progressPercentage,
      )
    }

    // For the final chunk, ensure we reach exactly 100%
    if (chunk.final) {
      expect(chunk.progressPercentage).toBe(100)
    }

    // Verify progress percentage is reasonable (0-100%)
    expect(chunk.progressPercentage).toBeGreaterThanOrEqual(0)
    expect(chunk.progressPercentage).toBeLessThanOrEqual(100)
  }
}

