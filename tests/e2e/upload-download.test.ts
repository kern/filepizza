import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const testFilePath = path.join(__dirname, 'fixtures', 'testfile.txt')

function sha256(file: Buffer): string {
  return crypto.createHash('sha256').update(file).digest('hex')
}

test('uploader to downloader transfer', async ({ browser }) => {
  const fileBuffer = fs.readFileSync(testFilePath)
  const expectedChecksum = sha256(fileBuffer)

  const uploader = await browser.newPage()
  await uploader.goto('http://localhost:4100/')
  await uploader.setInputFiles('input[type="file"]', testFilePath)
  await uploader.getByText('Start').click()

  const shortInput = uploader.getByText('Short URL').locator('..').locator('input')
  await expect(shortInput).toBeVisible()
  const shareURL = await shortInput.inputValue()

  const downloader = await browser.newPage()
  await downloader.goto(shareURL)
  const downloadPromise = downloader.waitForEvent('download')
  await downloader.getByText('Download').click()
  const download = await downloadPromise
  const downloadedPath = await download.path()
  const downloadedBuffer = fs.readFileSync(downloadedPath!)
  expect(sha256(downloadedBuffer)).toBe(expectedChecksum)
})
