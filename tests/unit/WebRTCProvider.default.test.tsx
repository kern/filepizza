import { renderHook } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { WebRTCPeerServiceContext } from '../../src/components/WebRTCProvider'

const created: unknown[] = []

vi.mock('peerjs', () => ({
  default: class {
    id = 'browser-peer'
    constructor(options: unknown) {
      created.push(options)
    }
    on() {}
    off() {}
    destroy() {}
  },
}))

afterEach(() => vi.unstubAllGlobals())

it('creates the browser peer from the ICE endpoint by default', async () => {
  const fetchMock = vi.fn(async () =>
    Response.json({ host: 'relay.test', path: '/p', iceServers: [] }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const { result } = renderHook(() => useContext(WebRTCPeerServiceContext))
  const peer = await result.current.get()
  expect(peer.id).toBe('browser-peer')
  expect(fetchMock).toHaveBeenCalledWith('/api/ice', { method: 'POST' })
  expect(created).toEqual([
    { debug: 3, host: 'relay.test', path: '/p', config: { iceServers: [] } },
  ])
  result.current.stop()
})
