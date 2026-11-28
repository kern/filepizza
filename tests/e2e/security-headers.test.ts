/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test'

test('serves security headers on pages and static assets', async ({
  request,
}) => {
  for (const path of ['/', '/stream.html', '/sw.js']) {
    const headers = (await request.get(path)).headers()
    expect(headers['content-security-policy']).toContain("default-src 'self'")
    expect(headers['content-security-policy']).toContain("object-src 'none'")
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  }
})

test('blocks third-party scripts and frames', async ({ page }) => {
  const violations: string[] = []
  page.on('console', (message) => {
    if (/content security policy/i.test(message.text())) {
      violations.push(message.text())
    }
  })
  await page.goto('http://localhost:3000/')
  await page.evaluate(() => {
    const script = document.createElement('script')
    script.src = 'https://third-party.example/script.js'
    document.head.appendChild(script)
    const frame = document.createElement('iframe')
    frame.src = 'https://third-party.example/'
    document.body.appendChild(frame)
  })
  await expect.poll(() => violations.length).toBeGreaterThanOrEqual(2)
  expect(violations.some((v) => v.includes('script-src'))).toBe(true)
  expect(violations.some((v) => v.includes('frame-src'))).toBe(true)
})
