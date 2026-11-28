import { test as base, expect } from '@playwright/test'
import { networkInterfaces } from 'os'

// Two browser contexts in one test run talk to each other over WebRTC on the
// same machine. Safari/WebKit (and recent Chromium and Firefox) hide a peer's
// real address behind an mDNS name (<uuid>.local), and a CI runner often can't
// resolve those between contexts. The only path left is the runner's public
// address through STUN, which needs NAT hairpinning, and that works on some
// runners and not others: the connection then never leaves ICE `checking`
// and every test that needs a peer connection fails together.
//
// So the test browsers rewrite those names in incoming ICE candidates to the
// machine's own address. Only the test harness does this; the app is untouched.

function machineAddress(): string {
  for (const list of Object.values(networkInterfaces())) {
    for (const entry of list ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address
    }
  }
  return '127.0.0.1'
}

function rewriteMdnsCandidates(address: string) {
  if (typeof RTCPeerConnection === 'undefined') return
  const addIceCandidate = RTCPeerConnection.prototype.addIceCandidate
  RTCPeerConnection.prototype.addIceCandidate = function (
    this: RTCPeerConnection,
    candidate?: RTCIceCandidateInit | null,
  ) {
    if (candidate && typeof candidate.candidate === 'string') {
      return addIceCandidate.call(
        this,
        new RTCIceCandidate({
          candidate: candidate.candidate.replace(
            /[0-9a-f-]{36}\.local/g,
            address,
          ),
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
          usernameFragment: candidate.usernameFragment,
        }),
      )
    }
    return addIceCandidate.call(this, candidate)
  } as typeof addIceCandidate
}

export const test = base.extend({
  // Every context made from this browser, whether by Playwright's own
  // `context`/`page` fixtures or by a spec calling `browser.newContext()`.
  browser: async ({ browser }, use) => {
    const newContext = browser.newContext.bind(browser)
    const address = machineAddress()
    browser.newContext = async (...args) => {
      const context = await newContext(...args)
      await context.addInitScript(rewriteMdnsCandidates, address)
      return context
    }
    await use(browser)
    browser.newContext = newContext
  },
})

export { expect }
