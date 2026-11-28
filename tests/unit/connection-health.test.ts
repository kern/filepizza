import { describe, expect, it, vi } from 'vitest'
import { closeWhenConnectionFails } from '../../src/utils/connection-health'

function fakePeerConnection() {
  const target = new EventTarget()
  return Object.assign(target, {
    iceConnectionState: 'connected' as RTCIceConnectionState,
    connectionState: 'connected' as RTCPeerConnectionState,
  }) as unknown as RTCPeerConnection
}

describe('closeWhenConnectionFails', () => {
  it('closes the connection once ICE fails', () => {
    const peerConnection = fakePeerConnection()
    const close = vi.fn()
    closeWhenConnectionFails({ peerConnection, close })

    // A flaky network can recover from these, so they don't close anything.
    ;(peerConnection as { iceConnectionState: string }).iceConnectionState =
      'disconnected'
    peerConnection.dispatchEvent(new Event('iceconnectionstatechange'))
    expect(close).not.toHaveBeenCalled()

    ;(peerConnection as { iceConnectionState: string }).iceConnectionState =
      'failed'
    peerConnection.dispatchEvent(new Event('iceconnectionstatechange'))
    expect(close).toHaveBeenCalledOnce()
  })

  it('also closes when the overall connection state fails', () => {
    const peerConnection = fakePeerConnection()
    const close = vi.fn()
    closeWhenConnectionFails({ peerConnection, close })

    ;(peerConnection as { connectionState: string }).connectionState = 'failed'
    peerConnection.dispatchEvent(new Event('connectionstatechange'))
    expect(close).toHaveBeenCalledOnce()
  })

  it('stops watching when asked', () => {
    const peerConnection = fakePeerConnection()
    const close = vi.fn()
    const stop = closeWhenConnectionFails({ peerConnection, close })
    stop()

    ;(peerConnection as { iceConnectionState: string }).iceConnectionState =
      'failed'
    peerConnection.dispatchEvent(new Event('iceconnectionstatechange'))
    expect(close).not.toHaveBeenCalled()
  })

  it('ignores connections that expose no peer connection', () => {
    const stop = closeWhenConnectionFails({ close: vi.fn() })
    expect(() => stop()).not.toThrow()
  })
})
