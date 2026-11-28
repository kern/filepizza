import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import WebRTCProvider, {
  createPeerService,
  useWebRTCPeer,
} from '../../src/components/WebRTCProvider'
import { peerService, TestPeer } from '../support/providers'

function PeerControls() {
  const { peer, stop } = useWebRTCPeer()
  return <button onClick={stop}>{peer.id}</button>
}

describe('WebRTCProvider', () => {
  it('waits for the peer to open, reuses it, and destroys it on stop', async () => {
    const peer = new TestPeer('')
    const createPeer = vi.fn(() => peer)
    const service = createPeerService(
      async () =>
        Response.json({ host: 'relay.test', path: '/peer', iceServers: [] }),
      createPeer,
    )
    render(
      <WebRTCProvider service={service}>
        <PeerControls />
      </WebRTCProvider>,
    )
    expect(screen.getByText('Initializing WebRTC peer...')).toBeInTheDocument()

    await act(async () => {})
    peer.id = 'connected-peer'
    act(() => {
      peer.emit('open', peer.id)
    })
    expect(
      await screen.findByRole('button', { name: peer.id }),
    ).toBeInTheDocument()
    await expect(service.get()).resolves.toBe(peer)
    expect(createPeer).toHaveBeenCalledExactlyOnceWith({
      debug: 3,
      host: 'relay.test',
      path: '/peer',
      config: { iceServers: [] },
    })

    fireEvent.click(screen.getByRole('button', { name: peer.id }))
    expect(peer.destroyed).toBe(true)
    expect(service.current()).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    service.stop()
  })

  it('displays an initialization failure', async () => {
    const service = createPeerService(
      async () => {
        throw new Error('ICE unavailable')
      },
      () => new TestPeer(),
    )
    render(
      <WebRTCProvider service={service}>
        <PeerControls />
      </WebRTCProvider>,
    )
    expect(await screen.findByText('ICE unavailable')).toBeInTheDocument()
  })

  it('explains when WebRTC is disabled or unsupported', async () => {
    const createPeer = vi.fn(() => new TestPeer())
    const service = createPeerService(
      async () => Response.json({ iceServers: [] }),
      createPeer,
      () => false,
    )
    render(
      <WebRTCProvider service={service}>
        <PeerControls />
      </WebRTCProvider>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /WebRTC is disabled or not supported/,
    )
    expect(screen.queryByText('Initializing WebRTC peer...')).toBeNull()
    expect(createPeer).not.toHaveBeenCalled()
  })

  it('reports a peer error that happens before the peer opens', async () => {
    const peer = new TestPeer('')
    const service = createPeerService(
      async () => Response.json({ iceServers: [] }),
      () => peer,
    )
    render(
      <WebRTCProvider service={service}>
        <PeerControls />
      </WebRTCProvider>,
    )
    await act(async () => {})
    act(() => {
      peer.emit('error', new Error('Could not get an ID from the server.'))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not get an ID from the server.',
    )
    expect(peer.destroyed).toBe(true)
    expect(service.current()).toBeNull()
  })

  it('maps a browser-incompatible peer error to the WebRTC message', async () => {
    const peer = new TestPeer('')
    const service = createPeerService(
      async () => Response.json({ iceServers: [] }),
      () => peer,
    )
    const result = service.get()
    await act(async () => {})
    peer.emit(
      'error',
      Object.assign(new Error('Your browser does not support WebRTC'), {
        type: 'browser-incompatible',
      }),
    )
    await expect(result).rejects.toThrow(/WebRTC is disabled or not supported/)
  })

  it('describes a peer error that carries no message', async () => {
    const peer = new TestPeer('')
    const service = createPeerService(
      async () => Response.json({ iceServers: [] }),
      () => peer,
    )
    const withType = service.get()
    await act(async () => {})
    peer.emit('error', Object.assign(new Error(''), { type: 'server-error' }))
    await expect(withType).rejects.toThrow(
      'Could not connect to the signalling server (server-error)',
    )

    const withoutType = service.get()
    await act(async () => {})
    peer.emit('error', new Error(''))
    await expect(withoutType).rejects.toThrow('(unknown error)')
  })

  it('uses a peer that is already connected', async () => {
    const service = peerService()
    await service.get()
    render(
      <WebRTCProvider service={service}>
        <PeerControls />
      </WebRTCProvider>,
    )
    expect(
      await screen.findByRole('button', { name: 'test-peer' }),
    ).toBeInTheDocument()
  })

  it('requires a provider for consumers', () => {
    expect(() => render(<PeerControls />)).toThrow(
      'must be used within a WebRTCProvider',
    )
  })
})
