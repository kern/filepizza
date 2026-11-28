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
  await page.goto('http://localhost:3000/')
  // The securitypolicyviolation event fires in every engine; the console
  // message for a blocked request does not (Firefox doesn't report it there).
  await page.evaluate(() => {
    const seen: string[] = []
    ;(window as unknown as { __violations: string[] }).__violations = seen
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(event.effectiveDirective)
    })
    const script = document.createElement('script')
    script.src = 'https://third-party.example/script.js'
    document.head.appendChild(script)
    const frame = document.createElement('iframe')
    frame.src = 'https://third-party.example/'
    document.body.appendChild(frame)
  })

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __violations: string[] }).__violations,
      ),
    )
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^script-src/),
        'frame-src',
      ]),
    )
})
