import { test, expect } from '@playwright/test'
import { networkInterfaces } from 'os'
import { selectFile, startUpload } from './helpers'

// Temporary diagnostic: logs what WebKit's WebRTC does on this runner.
const probe = () => {
  const Original = window.RTCPeerConnection
  if (!Original) {
    console.log('DIAG no RTCPeerConnection')
    return
  }
  const Wrapped = function (this: unknown, ...args: unknown[]) {
    const pc = new (Original as unknown as new (...a: unknown[]) => RTCPeerConnection)(...args)
    const id = Math.random().toString(36).slice(2, 6)
    console.log('DIAG pc', id, 'config', JSON.stringify(args[0]))
    const log = (what: string) => console.log('DIAG', id, what)
    pc.addEventListener('iceconnectionstatechange', () => log('ice=' + pc.iceConnectionState))
    pc.addEventListener('icegatheringstatechange', () => log('gather=' + pc.iceGatheringState))
    pc.addEventListener('connectionstatechange', () => log('conn=' + pc.connectionState))
    pc.addEventListener('signalingstatechange', () => log('sig=' + pc.signalingState))
    pc.addEventListener('icecandidate', (e) => log('cand ' + (e.candidate ? e.candidate.candidate : 'END')))
    pc.addEventListener('icecandidateerror', (e) => {
      const err = e as RTCPeerConnectionIceErrorEvent
      log('candErr ' + err.errorCode + ' ' + err.errorText + ' ' + err.url)
    })
    return pc
  } as unknown as typeof RTCPeerConnection
  Wrapped.prototype = Original.prototype
  window.RTCPeerConnection = Wrapped
}

test('webkit peer connection diagnostics', async ({ browser }, testInfo) => {
  console.log('DIAG interfaces', JSON.stringify(networkInterfaces()))
  const up = await (await browser.newContext()).newPage()
  const down = await (await browser.newContext()).newPage()
  for (const [tag, page] of [['UP', up], ['DOWN', down]] as const) {
    await page.addInitScript(probe)
    page.on('console', (m) => {
      const t = m.text()
      if (/DIAG|PeerJS|\[WebRTCProvider\]|\[Downloader\]|\[UploaderConnections\]/.test(t)) {
        console.log(tag, t.slice(0, 300))
      }
    })
    page.on('pageerror', (e) => console.log(tag, 'PAGEERROR', e.message.slice(0, 200)))
  }
  console.log('DIAG UA', await up.evaluate(() => navigator.userAgent))

  await selectFile(up, 'diag.txt', 'diagnostic')
  const url = await startUpload(up)
  console.log('DIAG share url', url)
  await down.goto(url)
  let connected = true
  try {
    await expect(down.locator('#download-button')).toBeVisible({ timeout: 20000 })
  } catch {
    connected = false
  }
  console.log('DIAG RESULT connected=' + connected)
  console.log('DIAG downloader page:', (await down.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 300))
  expect(connected).toBe(true)
  void testInfo
})
