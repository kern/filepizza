// @vitest-environment node

import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as ice } from '../../src/routes/api.ice'
import { setTurnCredentials } from '../../src/coturn'

vi.mock('../../src/coturn', () => ({ setTurnCredentials: vi.fn() }))

const NOW = Date.UTC(2026, 0, 1)

beforeEach(() => {
  vi.stubEnv('COTURN_ENABLED', 'true')
  vi.stubEnv('TURN_HOST', '')
  vi.stubEnv('TURN_PORT', '')
  vi.stubEnv('TURNS_PORT', '')
  vi.stubEnv('TURN_TRANSPORT', '')
  vi.stubEnv('TURN_SECRET', '')
  vi.stubEnv('STUN_SERVER', '')
  vi.stubEnv('PEERJS_HOST', '')
  vi.stubEnv('PEERJS_PATH', '')
  vi.stubEnv('PEERJS_PORT', '')
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
  vi.mocked(setTurnCredentials).mockClear()
})

describe('/api/ice', () => {
  it('uses the default ports, no transport and stored credentials', async () => {
    const config = await (await ice()).json()
    expect(config.host).toBe('0.peerjs.com')
    expect(config.path).toBe('/')
    // No port is sent, so PeerJS keeps its default.
    expect(config).not.toHaveProperty('port')
    expect(config.iceServers[0]).toEqual({
      urls: 'stun:stun.l.google.com:19302',
    })
    const turn = config.iceServers[1]
    expect(turn.urls).toEqual(['turn:127.0.0.1:3478', 'turns:127.0.0.1:5349'])
    expect(setTurnCredentials).toHaveBeenCalledExactlyOnceWith(
      turn.username,
      turn.credential,
      86400,
    )
  })

  it('applies custom hosts, ports, transport and STUN/PeerJS settings', async () => {
    vi.stubEnv('TURN_HOST', 'turn.example.com')
    vi.stubEnv('TURN_PORT', '3479')
    vi.stubEnv('TURNS_PORT', '5350')
    vi.stubEnv('TURN_TRANSPORT', 'tcp')
    vi.stubEnv('STUN_SERVER', 'stun:stun.example.com:3478')
    vi.stubEnv('PEERJS_HOST', 'peers.example.com')
    vi.stubEnv('PEERJS_PATH', '/signal')
    vi.stubEnv('PEERJS_PORT', '9000')

    const config = await (await ice()).json()
    expect(config.host).toBe('peers.example.com')
    expect(config.path).toBe('/signal')
    expect(config.port).toBe(9000)
    expect(config.iceServers[0]).toEqual({
      urls: 'stun:stun.example.com:3478',
    })
    expect(config.iceServers[1].urls).toEqual([
      'turn:turn.example.com:3479?transport=tcp',
      'turns:turn.example.com:5350?transport=tcp',
    ])

    vi.stubEnv('TURN_TRANSPORT', 'udp')
    const udp = await (await ice()).json()
    expect(udp.iceServers[1].urls[0]).toBe(
      'turn:turn.example.com:3479?transport=udp',
    )
  })

  it('ignores an unrecognised transport', async () => {
    vi.stubEnv('TURN_TRANSPORT', 'sctp')
    const config = await (await ice()).json()
    expect(config.iceServers[1].urls[0]).toBe('turn:127.0.0.1:3478')
  })

  it('derives time-limited credentials from a shared secret', async () => {
    vi.stubEnv('TURN_SECRET', 'coturn-static-auth-secret')
    const config = await (await ice()).json()
    const turn = config.iceServers[1]

    // Expiry is a unix timestamp in seconds, 24 hours from now.
    expect(turn.username).toBe(String(NOW / 1000 + 86400))
    expect(turn.credential).toBe(
      createHmac('sha1', 'coturn-static-auth-secret')
        .update(turn.username)
        .digest('base64'),
    )
    // coturn recomputes the credential, so nothing is stored.
    expect(setTurnCredentials).not.toHaveBeenCalled()
  })

  it('only offers STUN when TURN is disabled', async () => {
    vi.stubEnv('COTURN_ENABLED', '')
    vi.stubEnv('TURN_SECRET', 'ignored')
    const config = await (await ice()).json()
    expect(config.iceServers).toEqual([
      { urls: 'stun:stun.l.google.com:19302' },
    ])
    expect(setTurnCredentials).not.toHaveBeenCalled()
  })
})
