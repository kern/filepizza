import { test, expect } from './fixtures'

test('home page loads', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  await expect(
    page.getByText('Peer-to-peer file transfers in your browser.'),
  ).toBeVisible()
})
