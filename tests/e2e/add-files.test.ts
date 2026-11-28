import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from './fixtures'
import { createTestFile, uploadFile, addFile } from './helpers'

test('user can add more files before starting upload', async ({ page }) => {
  const file1 = createTestFile('first.txt', 'A')
  const file2 = createTestFile('second.txt', 'B')

  await uploadFile(page, file1)

  // Add another file using the add files button
  await addFile(page, file2)

  // Both files should be listed
  await expect(page.getByText(file1.name)).toBeVisible()
  await expect(page.getByText(file2.name)).toBeVisible()
})

test('user can choose a folder instead of single files', async ({
  page,
}, testInfo) => {
  const folder = testInfo.outputPath('toppings')
  mkdirSync(join(folder, 'cheese'), { recursive: true })
  writeFileSync(join(folder, 'basil.txt'), 'basil')
  writeFileSync(join(folder, 'cheese', 'mozzarella.txt'), 'mozzarella')

  await page.goto('/')
  await page.locator('#drop-zone-folder-input').setInputFiles(folder)

  await expect(page.getByText(/start uploading 2 files/)).toBeVisible()
  await expect(page.getByText('basil.txt')).toBeVisible()
  await expect(page.getByText('mozzarella.txt')).toBeVisible()

  await page.locator('#add-folder-input').setInputFiles(folder)
  await expect(page.getByText(/start uploading 4 files/)).toBeVisible()
})
