/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

vi.stubGlobal(
  'fetch',
  vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ host: 'localhost', path: '/', iceServers: [] })),
    ),
  ),
)
vi.mock('peerjs', () => ({
  default: class {
    id = 'peer1'
    on(event: string, cb: (id: string) => void) {
      if (event === 'open') cb('peer1')
    }
    off() {}
    destroy() {}
  },
}))

import WebRTCProvider from '../../src/components/WebRTCProvider'

const Child = () => <div>child</div>

describe('WebRTCProvider', () => {
  const OriginalRTCPeerConnection = window.RTCPeerConnection

  beforeEach(() => {
    // jsdom may not define RTCPeerConnection; PeerJS / our guard need a function.
    Object.defineProperty(window, 'RTCPeerConnection', {
      configurable: true,
      writable: true,
      value: OriginalRTCPeerConnection ?? class {},
    })
  })

  afterEach(() => {
    cleanup()
    Object.defineProperty(window, 'RTCPeerConnection', {
      configurable: true,
      writable: true,
      value: OriginalRTCPeerConnection,
    })
  })

  it('renders children after init', async () => {
    const { getByText } = render(
      <WebRTCProvider>
        <Child />
      </WebRTCProvider>,
    )
    await waitFor(() => expect(getByText('child')).toBeInTheDocument())
  })

  it('shows a visible error when WebRTC is unavailable', async () => {
    Object.defineProperty(window, 'RTCPeerConnection', {
      configurable: true,
      writable: true,
      value: undefined,
    })

    const { getByRole, queryByText } = render(
      <WebRTCProvider>
        <Child />
      </WebRTCProvider>,
    )

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(/WebRTC is disabled or not supported/i)
    })
    expect(queryByText('Initializing WebRTC peer...')).not.toBeInTheDocument()
    expect(queryByText('child')).not.toBeInTheDocument()
  })
})
