/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test'
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
