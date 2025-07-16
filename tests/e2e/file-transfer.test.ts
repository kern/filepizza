/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test'
import {
  createTestFile,
  uploadFile,
  startUpload,
  downloadFile,
  verifyFileIntegrity,
  verifyTransferCompletion,
  createBrowserContexts,
  monitorChunkProgress,
  verifyPreciseProgress,
} from './helpers'

interface TestCase {
  name: string
  fileSizeMultiplier: number
  expectedChunks: number
  fillChar: string
}

const CHUNK_SIZE = 256 * 1024 // 256 KB

const testCases: TestCase[] = [
  {
    name: 'tiny file (basic transfer)',
    fileSizeMultiplier: 0.1, // ~26KB
    expectedChunks: 1,
    fillChar: 'T',
  },
  {
    name: 'small file (single chunk)',
    fileSizeMultiplier: 0.5, // 128KB
    expectedChunks: 1,
    fillChar: 'S',
  },
  {
    name: 'medium file (3 chunks)',
    fileSizeMultiplier: 2.5, // 640KB
    expectedChunks: 3,
    fillChar: 'M',
  },
  {
    name: 'large file (4 chunks)',
    fileSizeMultiplier: 4, // 1024KB
    expectedChunks: 4,
    fillChar: 'L',
  },
  {
    name: 'extra large file (7 chunks)',
    fileSizeMultiplier: 6.5, // ~1664KB
    expectedChunks: 7,
    fillChar: 'X',
  },
]

for (const testCase of testCases) {
  test(`file transfer: ${testCase.name}`, async ({ browser }) => {
    const fileSize = Math.floor(CHUNK_SIZE * testCase.fileSizeMultiplier)
    const testFile = createTestFile(
      `test-${testCase.fillChar.toLowerCase()}-${testCase.expectedChunks}chunks.txt`,
      testCase.fillChar.repeat(fileSize)
    )

    const { uploaderPage, downloaderPage, cleanup } = await createBrowserContexts(browser)

    try {
      // Set up precise chunk and progress monitoring
      const monitor = await monitorChunkProgress(uploaderPage, downloaderPage, fileSize)

      await uploadFile(uploaderPage, testFile)
      const shareUrl = await startUpload(uploaderPage)
      const downloadPath = await downloadFile(downloaderPage, shareUrl, testFile)
      
      await verifyFileIntegrity(downloadPath, testFile)
      await verifyTransferCompletion(downloaderPage)

      // Wait for all async progress captures to complete
      await downloaderPage.waitForTimeout(1000)

      // Verify precise progress tracking for both upload and download
      verifyPreciseProgress(monitor.uploadChunks, testCase.expectedChunks, 'upload')
      verifyPreciseProgress(monitor.downloadChunks, testCase.expectedChunks, 'download')

      // Verify final completion shows exactly 100% on both sides
      await expect(uploaderPage.locator('#progress-percentage')).toHaveText('100%')
      await expect(downloaderPage.locator('#progress-percentage')).toHaveText('100%')

    } finally {
      await cleanup()
    }
  })
}
